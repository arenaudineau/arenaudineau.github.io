const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 175;
const MASS_RADIUS = 15;
const MASS_MAX_DELTA = 35;
const MASS_LIMIT = MASS_RADIUS + MASS_MAX_DELTA;

const DEFAULT_STIFNESS = 8.;

const NODES_X_STEP = (CANVAS_WIDTH  - 2 * MASS_LIMIT) / 2
const NODES_Y_STEP = (CANVAS_HEIGHT - 2 * MASS_RADIUS) / 3

class Mass {
	constructor(pos, fixed=false) {
		this.pos = pos;
		this.rest_pos = pos.copy();
		this.speed = 0;
		this.acc = 0;
		
		this.is_clamped = false;
		this.fixed = fixed;
	}

	update(force) {
		if (this.is_clamped || this.fixed)
			return;

		if (!force) {
			force = 0.;
		}

		const dt_sec = deltaTime / 1000;

		// Leapfrog Integration
		const tmp_speed = this.speed + 0.5 * this.acc * dt_sec;
		this.set_pos(this.pos.x + tmp_speed * dt_sec);
		this.acc = force - 2 * this.speed; // Dampened force
		this.speed = tmp_speed + 0.5 * this.acc * dt_sec;
	}

	set_pos(pos) {
		const diff = this.rest_pos.x - pos;
		if (Math.abs(diff) < MASS_MAX_DELTA) {
			this.pos.x = pos;
		}
		else {
			this.pos.x = this.rest_pos.x - Math.sign(diff) * MASS_MAX_DELTA;
		}
	}

	clamp(pos) {
		this.is_clamped = true;
		this.set_pos(pos.x);
	}

	unclamp() {
		this.is_clamped = false;
	}

	draw() {
		push();
		noStroke();
		fill(0);
		ellipse(this.pos.x, this.pos.y, MASS_RADIUS);

		if (this.is_clamped || this.fixed) {
			noFill();
			strokeWeight(2);
			
			if (phase && this === nodes[nodes.length - 1]) {
				stroke(255,0,0);
			}
			else {
				stroke(0);
			}

			ellipse(this.pos.x, this.pos.y, MASS_RADIUS*1.5);
		}
		pop();
	}
}

class Spring {
	constructor(nodeA, nodeB, stiffness=DEFAULT_STIFNESS) {
		if (nodeA.rest_pos.x < nodeB.rest_pos.x) {
			this.node_left  = nodeA;
			this.node_right = nodeB;
		}
		else {
			this.node_left  = nodeB;
			this.node_right = nodeA;
		}
		this.rest_length = this.node_right.rest_pos.x - this.node_left.rest_pos.x;

		this.stiffness = stiffness;
	}

	compute_base_force() {
		return this.stiffness * (this.node_right.pos.x - this.node_left.pos.x - this.rest_length);
	}

	compute_stiffness_grad() {
		const delta = (this.node_right.pos.x - this.node_left.pos.x - this.rest_length);
		return delta * delta; // * 0.5 but dont care for proportional update
	}

	compute_force(node) {
		if (node === this.node_left) {
			return this.compute_base_force();
		}
		else if (node === this.node_right) {
			return -this.compute_base_force();
		}
		else {
			return 0;
		}
	}

	draw() {
		push();
		stroke(0);
		strokeWeight(5);
		line(this.node_left.pos.x, this.node_left.pos.y, this.node_right.pos.x, this.node_right.pos.y)
		pop();
	}
}

var nodes = [
	new Mass(new p5.Vector(MASS_LIMIT, CANVAS_HEIGHT / 3 - MASS_RADIUS), true),
	new Mass(new p5.Vector(MASS_LIMIT, 2 * CANVAS_HEIGHT / 3 - MASS_RADIUS), true),
	// new Mass(new p5.Vector(MASS_LIMIT, MASS_RADIUS + 100), true),
	new Mass(new p5.Vector(MASS_LIMIT + NODES_X_STEP, CANVAS_HEIGHT / 4 - MASS_RADIUS)),
	new Mass(new p5.Vector(MASS_LIMIT + NODES_X_STEP, 2 * CANVAS_HEIGHT / 4 - MASS_RADIUS)),
	new Mass(new p5.Vector(MASS_LIMIT + NODES_X_STEP, 3 * CANVAS_HEIGHT / 4 - MASS_RADIUS)),
	// new Mass(new p5.Vector(MASS_LIMIT + 2*NODES_X_STEP, MASS_RADIUS)),
	new Mass(new p5.Vector(MASS_LIMIT + 2*NODES_X_STEP, 2 * CANVAS_HEIGHT / 4 - MASS_RADIUS)),
	// new Mass(new p5.Vector(MASS_LIMIT + 2*NODES_X_STEP, MASS_RADIUS + 100)),
];
var links = [
	new Spring(nodes[0], nodes[2]),
	// new Spring(nodes[0], nodes[4]),
	new Spring(nodes[0], nodes[4]),
	
	// new Spring(nodes[1], nodes[3]),
	new Spring(nodes[1], nodes[3]),
	new Spring(nodes[1], nodes[4]),

	// new Spring(nodes[2], nodes[3]),
	// new Spring(nodes[2], nodes[4]),
	// new Spring(nodes[2], nodes[5]),

	new Spring(nodes[2], nodes[3]),
	
	new Spring(nodes[2], nodes[5]),
	// new Spring(nodes[4], nodes[6]),
	new Spring(nodes[4], nodes[5]),
]

const FREE_PHASE = 0;
const NUDGE_PHASE = 1;
const UPDATE_PHASE = 2;

var clamped_node = null;
var last_clamped_node = null;
var last_clamped_time = 0;
var phase = FREE_PHASE;

function setup() {
	canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	canvas.parent("canvas-container");

	nodes.forEach((node, i) => {
		let elem = document.createElement('li')
		elem.id = 'position-' + i;
		elem.innerText = '#' + i + ': ' + ((node.pos.x - node.rest_pos.x) / MASS_MAX_DELTA).toFixed(2);
		document.getElementById('position-list').appendChild(elem);
	})

	document.getElementById("phase-switch").addEventListener('change', e => {
		if (e.target.checked) {
			phase = NUDGE_PHASE;
		}
		else {
			phase = FREE_PHASE;
			nodes[nodes.length - 1].unclamp();
		}
	});

	document.getElementById("apply-grad-btn").addEventListener('click', _ => {
		if (phase === NUDGE_PHASE) {
			phase = UPDATE_PHASE;
		}
	});
}

function draw() {
	background("#afcdea");

	push();
	stroke(100);
	strokeWeight(5);
	line(MASS_LIMIT, 0, MASS_LIMIT, CANVAS_HEIGHT-10);
	line(MASS_LIMIT + NODES_X_STEP, 0, MASS_LIMIT + NODES_X_STEP, CANVAS_HEIGHT-10);
	line(MASS_LIMIT + 2*NODES_X_STEP, 0, MASS_LIMIT + 2*NODES_X_STEP, CANVAS_HEIGHT-10);
	pop();

	if (clamped_node) {
		clamped_node.clamp(createVector(mouseX, mouseY));
	}

	if (phase === UPDATE_PHASE) {
		links.forEach((link, i) => {
			grad = link.compute_stiffness_grad();
			console.log("Link #" + i + ": " + grad);

			link.stiffness -= 0.001 * grad;
		});
		
		document.getElementById("phase-switch").checked = false;
		
		phase = FREE_PHASE;
		nodes[nodes.length - 1].unclamp();
	}

	nodes.forEach((node, i) => {
		const force =
			links.reduce(
				(force, link) => force + link.compute_force(node),
				0
			);
		
		node.update(force);
		node.draw();

		const new_text = '#' + i + ': ' + ((node.pos.x - node.rest_pos.x) / MASS_MAX_DELTA).toFixed(2);
		const pos_elem = document.getElementById('position-' + i);
		if (pos_elem.innerText != new_text) {
			pos_elem.innerText = new_text;
		}
	})

	links.forEach(link => {
		link.draw();
	})

	drawArrow(createVector(CANVAS_WIDTH/2, CANVAS_HEIGHT - 10), createVector(CANVAS_WIDTH-30, 0));
	push();
	textSize(20);
	text("x", CANVAS_WIDTH - 10, CANVAS_HEIGHT - 5);
	pop();
}

function drawArrow(pos, vec) { // code from p5.js doc
	push();
	stroke(0);
	strokeWeight(5);
	translate(pos.x - vec.x / 2, pos.y - vec.y / 2); // Center the arrow around the position
	line(0, 0, vec.x, vec.y);
	rotate(vec.heading());
	let arrowSize = 7;
	translate(vec.mag() - arrowSize, 0);
	triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
	pop();
}

function keyTyped() {
	if (key == "e") {
		console.log(links.map(link => link.compute_stiffness_grad().toFixed(2)));
	}
}

function mousePressed() {
	if (phase === UPDATE_PHASE)
		return;

	for (var i = 0; i < nodes.length; i++) {
		let node = nodes[i];

		if (mouseX > node.pos.x - MASS_RADIUS/2. && mouseX < node.pos.x + MASS_RADIUS/2. &&
			mouseY > node.pos.y - MASS_RADIUS/2. && mouseY < node.pos.y + MASS_RADIUS/2.)
		{
			if (last_clamped_node === node && millis() - last_clamped_time < 300) {
				node.set_pos(node.rest_pos.x);
				last_clamped_node = null;
			}
			else if (!phase || node === nodes[nodes.length - 1]) {
				clamped_node = node;
			}

			break;
		}
	}
}

function mouseReleased() {
	if (phase === UPDATE_PHASE)
		return;

	if (clamped_node) {
		last_clamped_node = clamped_node;
		last_clamped_time = millis();

		if (mouseButton === LEFT && !phase) {
			clamped_node.unclamp();
		}

		clamped_node = null;
	}
}