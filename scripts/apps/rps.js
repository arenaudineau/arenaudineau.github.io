const ROCK_TYPE = 0;
const PAPER_TYPE = 1;
const SCISSORS_TYPE = 2;

const TYPE_COLORS = [
	[255, 0, 0, 255],
	[0, 255, 0, 255],
	[0, 0, 255, 255],
]

let MIN_DIM = null;

let TIME = 0;
const FIND_TARGET_TIMEOUT = 0.1; // Every 100ms

let rocks = [];
let papers = [];
let scissors = [];

let selected_entity = null;

class Entity {
	constructor(uid, pos, dir, type) {
		this.uid = uid;

		this.pos = pos;
		this.dir = dir;

		this.target = null;
		this.chasers = [];

		this.change_type(type);
	}

	change_type(new_type) {
		this.type = new_type;

		this.prey_entities = null;
		this.predatory_entities = null;
		this.friend_entities = null;

		if (this.type == ROCK_TYPE) {
			this.prey_entities = scissors;
			this.predatory_entities = papers;
			this.friend_entities = rocks;
		}
		else if (this.type == PAPER_TYPE) {
			this.prey_entities = rocks;
			this.predatory_entities = scissors;
			this.friend_entities = papers;
		}
		else if (this.type == SCISSORS_TYPE) {
			this.prey_entities = papers;
			this.predatory_entities = rocks;
			this.friend_entities = scissors;
		}

		this.friend_entities.push(this);
	}

	// Return the position of the entity with the origin taken at the center of the canvas
	centered_pos() {
		return createVector(this.pos.x - width / 2, this.pos.y - height / 2);
	}

	find_target() {
		if (this.target != null) {
			this.remove_target();
		}

		let closest = null;
		let closest_dist = Infinity;

		// We only look for the entities that we can kill
		this.prey_entities.forEach(ent => {
			if (ent.uid == this.uid) return;

			if (this.type == ROCK_TYPE && ent.type != SCISSORS_TYPE) return;
			if (this.type == PAPER_TYPE && ent.type != ROCK_TYPE) return;
			if (this.type == SCISSORS_TYPE && ent.type != PAPER_TYPE) return;

			let dist = p5.Vector.sub(this.pos, ent.pos).magSq();
			if (dist < closest_dist) {
				closest_dist = dist;
				closest = ent;
			}
		});

		if (closest == null) {
			return;
		}

		this.target = closest;
		this.target.chasers.push(this);
	}

	remove_target() {
		if (this.target != null) {
			this.target.chasers.splice(this.target.chasers.indexOf(this), 1); // Remove self from the target's chasers
			this.target = null;
		}
	}

	update_pos(dt) {
		if (this.prevent_move) {
			return;
		}

		let delta_pos = p5.Vector.mult(this.dir, dt / 30);
		this.pos.add(delta_pos);

		if (this.pos.x > width) {
			this.pos.x = 0;
		}
		else if (this.pos.x < 0) {
			this.pos.x = width;
		}

		if (this.pos.y > height) {
			this.pos.y = 0;
		}
		else if (this.pos.y < 0) {
			this.pos.y = height;
		}
	}

	update_dir() {
		// Avoid friends
		this.friend_entities.forEach(ent => {
			if (ent.uid == this.uid) return;

			let dir = p5.Vector.sub(this.pos, ent.pos);
			if (dir.magSq() < 20 * 20 * 4) {
				dir.setMag(0.1);
				this.dir.add(dir);
			}
		});

		// Run away from predators
		this.predatory_entities.forEach(ent => {
			let dir = p5.Vector.sub(this.pos, ent.pos);
			dir.setMag(0.001);
			this.dir.add(dir);
		});

		// Stay in the center
		if (this.centered_pos().magSq() > MIN_DIM * MIN_DIM / 9) {
			let dist = p5.Vector.sub(createVector(width / 2, height / 2), this.pos);
			dist.setMag(0.5);
			this.dir.add(dist);
		}

		// Chase the target
		if (this.target != null) {
			let dist = p5.Vector.sub(this.target.pos, this.pos)

			dist.setMag(0.1);
			this.dir.add(dist);
			this.dir.setMag(1.1); // Go quicker when chasing
		}
		else {
			this.dir.setMag(1.0);
		}
	}

	update_collision() {
		for (let i = 0; i < this.predatory_entities.length; i++) {
			let ent = this.predatory_entities[i];

			let dist = p5.Vector.sub(this.pos, ent.pos).magSq();
			if (dist < 20 * 20) {
				this.friend_entities.splice(this.friend_entities.indexOf(this), 1);
				this.change_type(ent.type);

				ent.remove_target();
				this.chasers.forEach(chaser => chaser.remove_target()); // We changed of type so the chasers target the wrong entity

				this.find_target(); // Immediately find a new target
				return;
			}
		};
	}

	draw() {
		if (this.type == ROCK_TYPE) {
			image(rock_img, this.pos.x - 10, this.pos.y - 10, 20, 20);
		}
		else if (this.type == PAPER_TYPE) {
			image(paper_img, this.pos.x - 10, this.pos.y - 10, 20, 20);
		}
		else if (this.type == SCISSORS_TYPE) {
			image(scissors_img, this.pos.x - 10, this.pos.y - 10, 20, 20);
		}
	}

	// Same but using rects instead of imgs
	draw_debug() {
		push();
		noStroke();
		fill(TYPE_COLORS[this.type]);
		rect(this.pos.x - 10, this.pos.y - 10, 20, 20);
		pop();
	}
}

function create_entity_in_area(id, pos, radius, type) {
	let x = random(-radius, radius);
	let y = random(-radius, radius);
	let dir_x = random();
	let dir_y = random();

	pos.x += x;
	pos.y += y;

	const dir = createVector(dir_x, dir_y).normalize();

	return new Entity(id, pos, dir, type);
}

function forEachEntity(fn) {
	dt = deltaTime;

	for (let i = 0; i < rocks.length; i++) {
		if (fn(dt, rocks[i])) {
			break;
		}
	}

	for (let i = 0; i < papers.length; i++) {
		if (fn(dt, papers[i])) {
			break;
		}
	}

	for (let i = 0; i < scissors.length; i++) {
		if (fn(dt, scissors[i])) {
			break;
		}
	}
}

function setup() {
	var cnv = createCanvas(windowWidth, windowHeight);
	cnv.style('display', 'block');

	MIN_DIM = Math.min(windowWidth, windowHeight);

	frameRate(60);

	const count = 30;

	for (let i = 0; i < count; i++) {
		create_entity_in_area(i, createVector(width / 2 - 200, height / 2 - 100), 200, ROCK_TYPE);
	}

	for (let i = count; i < 2 * count; i++) {
		create_entity_in_area(i, createVector(width / 2 + 200, height / 2 - 100), 200, SCISSORS_TYPE);
	}

	for (let i = 2 * count; i < 3 * count; i++) {
		create_entity_in_area(i, createVector(width / 2, height / 2 + 200), 200, PAPER_TYPE);
	}

	forEachEntity((_, ent) => ent.find_target());
}

let rock_img;
let paper_img;
let scissors_img;
function preload() {
	rock_img = loadImage('../../assets/rps/rock.png');
	paper_img = loadImage('../../assets/rps/paper.png');
	scissors_img = loadImage('../../assets/rps/scissors.png');
}

function draw() {
	background(0); // bl4ck

	TIME += deltaTime / 1000;

	if (TIME > FIND_TARGET_TIMEOUT) {
		TIME = 0;
		forEachEntity((_, ent) => ent.find_target());
	}

	forEachEntity((dt, ent) => {
		ent.update_collision();
		ent.update_dir();
		ent.update_pos(dt);
		//ent.draw_debug();
		ent.draw();
	});

	/*	forEachEntity((_, ent) => {
			if (ent.target != null) {
				line(ent.pos.x, ent.pos.y, ent.target.pos.x, ent.target.pos.y);
			}
		});*/

	if (selected_entity != null) {
		selected_entity.pos = createVector(mouseX, mouseY);
	}
}

function mousePressed() {
	forEachEntity((_, ent) => {
		if (mouseX > ent.pos.x - 15 && mouseX < ent.pos.x + 15 && mouseY > ent.pos.y - 15 && mouseY < ent.pos.y + 15) {
			ent.prevent_move = true;
			ent.pos = createVector(mouseX, mouseY);
			selected_entity = ent;
			return true;
		}
	});
}

function mouseReleased() {
	if (selected_entity != null) {
		selected_entity.prevent_move = false;
		selected_entity = null;
	}
}