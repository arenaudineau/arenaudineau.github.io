class Electron {
	constructor(pos, vit) {
		this.pos = pos;
		this.vit = vit.mag();
		this.dir = vit.normalize()
		this.radius = 10
	}

	update(cats, field) {
		for (var i = 0; i < cats.length; ++i) {
			var cat = cats[i]

			var CA = p5.Vector.sub(this.pos, cat.pos)
			var prod_uCA = this.dir.dot(CA)


			var discr = 4 * prod_uCA * prod_uCA - 4 * (CA.magSq() - cat.ray * cat.ray / 2)

			if (discr >= 0) {
				var t = -0.5 * (2 * prod_uCA + Math.sqrt(discr))
				if (t < -this.vit / 3 || t > this.vit) {
					continue
				}
				if (t < 0 && t > -this.vit / 3) {
					this.pos.add(p5.Vector.mult(this.dir, t))
					break
				}

				var P = p5.Vector.add(this.pos, p5.Vector.mult(this.dir, t))

				var N = p5.Vector.sub(cat.pos, P).normalize()
				var u = p5.Vector.sub(P, this.pos).normalize()
				this.dir = p5.Vector.sub(u, p5.Vector.mult(N, 2 * N.dot(u)))
				return
			}
		}

		if (field) {
			this.dir.x -= 0.1
			this.dir.normalize()
		}
		this.pos.add(p5.Vector.mult(this.dir, this.vit))

		if (this.pos.x > width) {
			this.pos.x = 0
		}
		else if (this.pos.x < 0) {
			this.pos.x = width
		}

		if (this.pos.y > height) {
			this.pos.y = 0
		}
		else if (this.pos.y < 0) {
			this.pos.y = height
		}
	}

	draw() {
		push()
		noStroke()
		fill(255, 0, 0)
		ellipse(this.pos.x, this.pos.y, this.radius)
		pop()
	}
}

class Cation {
	constructor(pos) {
		this.pos = pos
		this.ray = 20
	}

	get_normal() { }

	draw() {
		push()
		fill('#1E1E1E')
		strokeWeight(this.ray)
		point(this.pos.x, this.pos.y)
		pop()
	}

	static draw_many_start() {
		push()
		fill('#1E1E1E')
		stroke('#1E1E1E')
	}
	draw_many() {
		ellipse(this.pos.x, this.pos.y, 20)
	}
	static draw_many_end() {
		pop()
	}
}

var el = []
var cats = []
var frame_count
var vit_moyenne
var field = false
var electron_count
var electron_count_input

function setup() {
	electron_count_input = document.getElementById("elec_count")
	electron_count = electron_count_input.value
	electron_count_input.addEventListener("input", function (e) {
		const diff = electron_count_input.value - electron_count
		create_electrons(diff)
		electron_count = electron_count_input.value
	})

	canvas = createCanvas(500, 500);
	canvas.parent("canvas-container")
	create_electrons(electron_count)

	for (var i = 0; i <= width / 50; ++i) {
		for (var j = 0; j <= height / 50; ++j) {
			let x = 50 * i
			let y = 50 * j
			if (i % 2 == 0) {
				y += 25
			}

			cats.push(new Cation(createVector(x, y)))
		}
	}

	frame_count = 0
	vit_moyenne = createVector(0, 0)
}


function draw() {
	background("#90a7be")


	if (field) {
		push()
		fill(0, 250, 0)
		noStroke()
		rect(width / 2.5 - width / 3, height / 2 - height / 6, 2 * width / 3, height / 3)
		triangle(width / 2.5 + width / 3, height / 2 - height / 6 - height / 8, width / 2.5 + 1.5 * width / 3, height / 2, width / 2.5 + width / 3, height / 2 + height / 6 + height / 8)
		pop()
	}

	Cation.draw_many_start()
	for (var i = 0; i < cats.length; ++i) {
		cats[i].draw_many()
	}
	Cation.draw_many_end()

	if (frame_count % 5 == 0) {
		vit_moyenne = createVector(0, 0)
	}

	for (var i = 0; i < el.length; ++i) {
		if (frame_count % 5 == 0) {
			vit_moyenne.add(p5.Vector.mult(el[i].dir, el[i].vit))
		}
		el[i].update(cats, field)
		el[i].draw()
	}

	if (frame_count % 5 == 0) {
		vit_moyenne.div(el.length)
	}

	push()
	const dir_arrow_pos = createVector(255, 22);
	fill(255)
	rect(0, 0, 280, 45)
	if (field) {
		fill('purple')
	}
	else {
		fill(0)
	}

	text("Vitesse individuelle des électrons: 10 u.a.", 5, 20)
	text("Vitesse moyenne des électrons: " + (5 * vit_moyenne.mag()).toPrecision(2) + " u.a.", 5, 35)
	drawArrow(dir_arrow_pos, vit_moyenne.copy().normalize().mult(25), 'blue')
	fill(0)
	circle(dir_arrow_pos.x, dir_arrow_pos.y, 5)
	pop()

	frame_count += 1
}

function create_electrons(N) {

	if (N > 0) {
		for (let i = 0; i < N; i++) {
			let x = random(0, width);
			let y = random(0, height);
			let dir_x = random()
			let dir_y = random()
			let vit = 2
			el.push(new Electron(createVector(x, y), createVector(dir_x, dir_y).normalize().mult(vit)))
		}
	}
	else {
		for (let i = 0; i < -N; i++) {
			el.pop()
		}
	}
}

function keyTyped() {
	if (key == "e") {
		field = !field
	}
}

function drawArrow(base, vec, color) {
	push();
	stroke(color);
	strokeWeight(3);
	fill(color);
	translate(base.x - vec.x / 2, base.y - vec.y / 2);
	line(0, 0, vec.x, vec.y);
	rotate(vec.heading());
	let arrowSize = 7;
	translate(vec.mag() - arrowSize, 0);
	triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
	pop();
}