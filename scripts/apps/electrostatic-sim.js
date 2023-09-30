class Charge {
	constructor(val, pos) {
		this.val = val;
		this.pos = pos;
		this.max_radius = 20;
	}

	copy() {
		return new Charge(this.val, this.pos.copy());
	}

	get_color() {
		if (this.val > 0) { // Positive charge = red
			return createVector(150 + 30 * this.val, 0, 0);
		}
		else if (this.val < 0) { // Negative charge = blue
			return createVector(0, 0, 150 + 30 * abs(this.val));
		}
		else { // Neutral charge = white
			return createVector(255, 255, 255);
		}
	}

	get_radius() {
		if (this.val == 0) {
			return 10;
		}
		else {
			const raw_radius = 10 + 2 * abs(this.val);

			if (raw_radius > this.max_radius) { // radius limit
				return this.max_radius;
			}
			return raw_radius;
		}
	}

	draw() {
		const radius = this.get_radius();

		push();
		fill(this.get_color().x, this.get_color().y, this.get_color().z);
		circle(this.pos.x, this.pos.y, radius);

		if (radius >= this.max_radius) {
			const text_size = this.max_radius / 2;
			const char_size = text_size / 4;

			var val_str = str(this.val);
			var x_offset = val_str.length;
			if (this.val > 0) {
				val_str = "+" + val_str;
				x_offset += 2; // Because the "+" seems to be quite big, 1 is not sufficient
			}

			const text_pos = p5.Vector.add(this.pos, createVector(-x_offset * char_size, +char_size));

			textSize(text_size);
			fill(255);
			text(val_str, text_pos.x, text_pos.y);
		}
		pop();
	}
}

class Field {
	constructor(charges) {
		this.charges = charges;
	}

	/* Return Field vector at position pos */
	value(pos) {
		var sum = new p5.Vector();

		for (var i = 0; i < this.charges.length; i++) {
			var r = p5.Vector.sub(pos, this.charges[i].pos);

			if (r.magSq() != 0) {
				var charge_effect = p5.Vector.mult(r, this.charges[i].val / (r.mag() * r.magSq())); // E(M) = q * k * \vec{OM} / OM^3 (here k = 1 instead of 1/4*pi*epsilon_0)
				sum.add(charge_effect);
			}
		}

		return sum;
	}

	potential(pos) {
		var sum = 0;

		for (var i = 0; i < this.charges.length; i++) {
			const dist = pos.dist(this.charges[i].pos);

			if (dist != 0) {
				sum += (this.charges[i].val * 1.6 * 1e-7) / (dist / 1000000000000.0 * 4.0 * 3.141592 * 8.85); // V(M) = q * k / OM (k = 1 instead of 1/4*pi*epsilon_0)
			}
		}

		return sum;
	}
}

class ArrowField {
	constructor(x_count, y_count, val_gen) {
		this.count = createVector(x_count, y_count);
		this.val_gen = val_gen;
	}

	draw() {
		for (var y = 1; y < this.count.y + 1; ++y) {
			for (var x = 1; x < this.count.x + 1; ++x) {
				const pos = createVector(width / (this.count.x + 1) * x, height / (this.count.y + 1) * y);
				var val = this.val_gen(pos);
				const mag = val.mag();

				if (mag != 0) {
					const intensity = 255 * (mag ** (3 / 4) * 1000); // No mathematical reason, it looks good
					this.drawArrow(pos, val.normalize().mult(20), intensity);
				}
			}
		}
	}

	drawArrow(pos, vec, intensity) { // code from p5.js doc
		push();
		stroke(intensity);
		strokeWeight(3);
		fill(intensity);
		translate(pos.x - vec.x / 2, pos.y - vec.y / 2); // Center the arrow around the position
		line(0, 0, vec.x, vec.y);
		rotate(vec.heading());
		let arrowSize = 7;
		translate(vec.mag() - arrowSize, 0);
		triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
		pop();
	}
}

class Equipotential {
	constructor(starting_point, field) {
		this.path_step = 0.01;
		this.points = [];
		this.starting_point = starting_point.copy();
		this.field = field;
		this.out_of_screen = false;
		this.incomplete_path = false;
		this.pot_val = 0;

		this.gen_path();
	}

	gen_path() {
		this.points.push(this.starting_point.copy());

		var last_point = this.starting_point;
		this.out_of_screen = false;

		var i = 0;
		do {
			var field_vec = this.field.value(last_point);
			var dir_vec = createVector(field_vec.y, -field_vec.x).normalize();

			if (this.out_of_screen) {
				dir_vec.mult(-1);
			}

			var next_point = p5.Vector.add(last_point, p5.Vector.mult(dir_vec, this.path_step));

			if (i % 1000 == 0) {
				if (this.out_of_screen) {
					this.points.unshift(next_point);
				}
				else {
					this.points.push(next_point);
				}
			}

			last_point = next_point;
			++i;

			if (!(last_point.x > -0.3 * width && last_point.x < 1.3 * width && last_point.y > -0.3 * height && last_point.y < 1.3 * height)) {
				if (this.out_of_screen) {
					this.incomplete_path = true;
					break;
				}

				this.out_of_screen = true;
				last_point = this.starting_point;
			}
		} while ((this.out_of_screen || i < 300 || last_point.dist(this.starting_point) > 200 * sqrt(2) * this.path_step) && i < 1000000);

		this.pot_val = this.field.potential(this.points[0]);
	}

	draw() {
		if (this.points.length < 2) {
			return;
		}

		push();
		fill(255, 204, 0);
		strokeWeight(2);
		stroke(255, 204, 0);
		circle(this.starting_point.x, this.starting_point.y, 7);
		noFill();

		if (this.incomplete_path) {
			drawingContext.setLineDash([5, 5]);
		}
		beginShape();
		curveVertex(this.points[0].x, this.points[0].y);
		curveVertex(this.points[0].x, this.points[0].y);

		for (var i = 1; i < this.points.length - 1; ++i) {
			curveVertex(this.points[i].x, this.points[i].y);
		}

		curveVertex(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
		curveVertex(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);

		if (this.points[0].dist(this.points[this.points.length - 1]) < 100) {
			endShape(CLOSE);
		}
		else {
			endShape();
		}

		if (this.incomplete_path) {
			drawingContext.setLineDash([]);
		}

		fill(100, 204, 100);
		stroke(0, 0, 0)
		textSize(15);
		var point = this.starting_point;
		var prefix = "";
		if (this.pot_val > 0) {
			prefix = "+";
		}
		text(prefix + this.pot_val.toFixed(2) + "V", point.x, point.y)
		pop();
	}
}

field = new Field([]);
arrows = undefined;
mouse_charge = undefined;
custom_charge_added = false;
equipotentials = [];

SIZE = undefined;
arrows_count_x = undefined;
arrows_count_y = undefined;

function setup() {
	var cnv = createCanvas(windowWidth, windowHeight);
	cnv.style('display', 'block');

	arrows_count_x = Math.floor(width / 29);
	arrows_count_y = Math.floor(height / 29);

	field.charges.push(new Charge(0, createVector(mouseX, mouseY))); // Mouse charge
	field.charges.push(new Charge(+1, createVector(width / 2, height / 2)));
	field.charges.push(new Charge(-1, createVector(width / 2 + (width / (arrows_count_x + 1)) * 5, height / 2)));
	field.charges.push(new Charge(-1, createVector(width / 2 - (width / (arrows_count_x + 1)) * 5, height / 2)));
	mouse_charge = field.charges[0];

	arrows = new ArrowField(arrows_count_x, arrows_count_y, function (pos) { return field.value(pos); });
}

function draw() {
	background(0); // bl4ck

	if (keyIsPressed && keyCode == SHIFT) {
		mouse_charge.pos.x = round(map(mouseX, 0, width, 0, arrows_count_x + 1)) * (width / (arrows_count_x + 1));
		mouse_charge.pos.y = round(map(mouseY, 0, height, 0, arrows_count_y + 1)) * (height / (arrows_count_y + 1));
	}
	else {
		mouse_charge.pos.x = mouseX;
		mouse_charge.pos.y = mouseY;
	}
	mouse_charge.draw();

	arrows.draw();

	for (var i = 0; i < field.charges.length; ++i) {
		field.charges[i].draw();
	}

	for (var i = 0; i < equipotentials.length; ++i) {
		equipotentials[i].draw();
	}

	draw_text();
	draw_back_button();
}

function draw_back_button() {
	const shadow_text = (mouseX >= width - 200 && mouseY <= 15)

	push();
	textSize(15);
	if (shadow_text) { fill(255, 255, 255, 50); }
	else { fill(255); }
	text("{Back to Home}", width - 150, 15);
	pop();
}

function draw_text() {
	const shadow_text = (mouseX <= 300 && mouseY <= 90)

	push();
	textSize(15);
	if (shadow_text) { fill(255, 255, 255, 50); }
	else { fill(255); }
	text("Click: add/remove charge or draw equipotential", 0, 15);
	text("Mouse Wheel: select charge value", 0, 30);
	text("Shift: Snap cursor on grid", 0, 45);
	text("Ctrl: Draw multiple equipotentials", 0, 60)
	text("[Scale: 1px = 1femtometer]", 0, 75)
	pop();
}

function mouseClicked() {
	if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
		return;
	}

	if (mouseX >= width - 150 && mouseY <= 15) {
		window.location.href = "../.."
	}

	for (var i = 1; i < field.charges.length; ++i) {
		const charge = field.charges[i];

		if (mouseX >= charge.pos.x - charge.get_radius() / 2 && mouseX <= charge.pos.x + charge.get_radius() / 2
			&& mouseY >= charge.pos.y - charge.get_radius() / 2 && mouseY <= charge.pos.y + charge.get_radius() / 2) {
			field.charges.splice(i, 1);
			custom_charge_added = true;

			mouse_charge_val = mouse_charge.val;
			mouse_charge.val = 0;
			update_equipotentials();
			mouse_charge.val = mouse_charge_val;
			return; // We don't add the new charge if we deleted one
		}
	}

	if (mouse_charge.val != 0) {
		field.charges.push(mouse_charge.copy());
		update_equipotentials();
		custom_charge_added = true;
	}
	else {
		// Draw equipotentials
		if ((keyIsPressed && keyCode == CONTROL) || equipotentials.length == 0) {
			equipotentials.push(new Equipotential(mouse_charge.pos, field));
		}
		else {
			equipotentials = [];
		}

	}
}

function mouseWheel(event) {
	if (event.delta > 0) {
		mouse_charge.val -= 1;
	}
	else {
		mouse_charge.val += 1;
	}
}

function update_equipotentials() {
	for (var i = 0; i < equipotentials.length; ++i) {
		equipotentials[i].points = [];
		equipotentials[i].gen_path();
	}
}