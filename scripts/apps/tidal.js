let planets = [];

const PX2M = 100; // 1 pixel = 100km

var moon_img;
var gui;

var g_radius_km = 6300; // R_T
var g_radius_kmMin = 50 * PX2M;
var g_radius_kmMax = 1000 * PX2M;

var g_moon_mass_kg = 7.3e22;
var g_moon_mass_kgMin = 1e20;
var g_moon_mass_kgMax = 1e24;
var g_moon_mass_kgStep = 100;

var g_dist_km = 1600 * PX2M;
var g_dist_kmMin = 1500 * PX2M;
var g_dist_kmMax = 10000 * PX2M;

var g_orbit_period = 15;
var g_orbit_periodMin = 5;
var g_orbit_periodMax = 30;

var g_day_duration = 15;
var g_day_durationMin = 5;
var g_day_durationMax = 30;

var g_planet_resolution = 18;
var g_planet_resolutionMin = 5;
var g_planet_resolutionMax = 30;
var g_planet_resolutionStep = 1;

var g_pause = false;

var g_color_saturation = 50;
var g_color_saturationMin = 0;
var g_color_saturationMax = 100;

var last_orbit_time;
var last_day_time;

class Planet {
  constructor(pos, radius, mass, plain = false) {
    this.pos = pos;
    this.radius = radius;
    this.mass = mass;
    this.plain = plain;

    if (!this.plain) {
      this.points = [];
      this.tidal_field = [];
      this.update(0);
    }
    else {
      this.rot = 0;
    }

    this.theta_interval = 20;
    this.phi_interval = 20;
  }

  update(rot) {
    if (this.plain) {
      this.rot = rot;
    }
    else {
      this.points.length = 0;

      for (let i = 0; i < g_planet_resolution; ++i) {
        let j_max = g_planet_resolution;
        let j_min = 1;
        if (i < 1) { // Do not draw the poles twice.
          j_min = 0;
          ++j_max;
        }

        for (let j = j_min; j < j_max; ++j) {
          const theta = 2.0 * 3.141592654 * i / g_planet_resolution + rot;
          const phi = 3.141592654 * j / g_planet_resolution;
    
          this.points.push(createVector(this.radius * cos(theta) * sin(phi), this.radius * cos(phi), this.radius * sin(theta) * sin(phi)).add(this.pos))
        }
      }
    }
  }

  compute_tidal(other_planet) {
    if (this.plain) {
      return;
    }

    this.tidal_field.length = 0;
    for (let i = 0; i < this.points.length; ++i) {
      const PL = p5.Vector.sub(this.points[i], other_planet.pos).mult(PX2M);
      const OL = p5.Vector.sub(this.pos, other_planet.pos).mult(PX2M);
      let acc = p5.Vector.sub(p5.Vector.mult(PL, 1 / (PL.mag() * PL.magSq())),
                              p5.Vector.mult(OL, 1 / (OL.mag() * OL.magSq())))
                            .mult(6.67e-11 * other_planet.mass);
      
      if (acc.mag() > this.radius / 3) {
        acc.normalize().mult(this.radius / 3);
      }
      else if (acc.mag() < this.radius / 10) {
        acc.normalize().mult(this.radius / 10);
      }

      this.tidal_field.push(acc);
    }
  }

  draw() {
    if (this.plain) {
      push();
      specularMaterial(255);
      texture(moon_img);
      translate(this.pos);
      sphere(this.radius);
      pop();
    }
    else {
      for (let i = 0; i < this.points.length; ++i) {
        push();
        translate(this.points[i]);
        draw_arrow(this.tidal_field[i], this.radius / 100);
        pop();
      }
    }
  }
}

function preload() {
  moon_img = loadImage('assets/tidal/moon.jpg');
}

function setup() { 
  let cvn = createCanvas(windowWidth, windowHeight, WEBGL);
  cvn.style('display', 'block');
  setAttributes('antialias', true);

  createEasyCam();

  document.oncontextmenu = function() { return false; }

  planets.push(new Planet(createVector(0,0,0), g_radius_km / PX2M, 6.0e24));
  planets.push(new Planet(createVector(g_dist_km / PX2M,0,0), 1700 / PX2M, 7.3e22, true));

  gui = createGui("Parameters");
  gui.addGlobals("g_radius_km", "g_moon_mass_kg", "g_dist_km", "g_orbit_period", "g_day_duration", "g_planet_resolution", "g_color_saturation", "g_pause");
} 

function draw(){
  background(0);
  directionalLight(255, 255, 220, -1, 0, 0);
  noStroke();

  if (g_dist_km / PX2M != planets[0].pos.dist(planets[1].pos)) {
    planets[1].pos = p5.Vector.add(planets[0].pos, p5.Vector.sub(planets[1].pos, planets[0].pos).normalize().mult(g_dist_km / PX2M));
  }

  if (g_radius_km / PX2M != planets[0].radius) {
    planets[0].radius = g_radius_km / PX2M;
  }

  if (g_moon_mass_kg != planets[1].mass) {
    planets[1].mass = g_moon_mass_kg;
  }

  const orbit_time = g_pause ? last_orbit_time : (millis() / g_orbit_period / 1000);
  planets[1].pos.x = g_dist_km / PX2M * cos(2 * 3.141592 * orbit_time);
  planets[1].pos.z = g_dist_km / PX2M * sin(2 * 3.141592 * orbit_time);

  const day_time = g_pause ? last_day_time : (millis() / g_day_duration / 1000);
  planets[0].update(2 * 3.141592 * day_time);
  planets[1].update(-2 * 3.141592 * orbit_time); // Make the moon spin at the same period it spins around the planet. 
  planets[0].compute_tidal(planets[1]);

  planets[0].draw();
  planets[1].draw();

  last_orbit_time = orbit_time;
  last_day_time = day_time;
}

function draw_arrow(vec, radius) { // inspired from p5.js doc
  const vec_mag = vec.mag();

  let dir = vec.copy();
  dir.normalize();
  
  const phi = atan2(dir.x, dir.z);
  const theta = acos(dir.y);
  
  const arrow_size = min(2 * radius, vec_mag / 5);
  
  const color_saturation_factor = 0.5 * (g_color_saturation + 55);
  push();
  noStroke();
  translate(-vec.x / 2, -vec.y / 2, -vec.z / 2);
  rotateY(phi);
  rotateX(theta);
  fill((dir.x + 1) * color_saturation_factor + 100,  (dir.y + 1) * color_saturation_factor + 100, (dir.z + 1) * color_saturation_factor + 100);
  emissiveMaterial((dir.x + 1) * color_saturation_factor + 100,  (dir.y + 1) * color_saturation_factor + 100, (dir.z + 1) * color_saturation_factor + 100);
  cylinder(radius, vec_mag);
  translate(0, -(arrow_size / 2 + vec_mag / 2), 0);
  cone(2 * radius, -arrow_size);
  pop();
}