var

// Quick DOM getter
$ = function(id) {
	return document.getElementById(id);
},

Graphics = function(canvasId) {

	var
	
	canvas = $(canvasId),
	ctx = canvas.getContext('2d'),
	width = canvas.width,
	height = canvas.height,
	qbcolor = ['000', 'rgb(0,0,128)', 'rgb(0,128,0)', 'rgb(0,128,128)', 'rgb(128,0,0)', 'rgb(128,0,128)', 'rgb(128,128,0)', 'rgb(204,204,204)', 'rgb(128,128,128)', 'rgb(0,0,255)', 'rgb(0,255,0)', 'rgb(0,255,255)', 'rgb(255,0,0)', 'rgb(255,0,255)', 'rgb(255,255,0)', 'rgb(255,255,255)'],
	ship = new Image(),
	shipLoaded = false,
	pixelData = null,
	
	circle = function(x, y, radius, color) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 6.3);
		ctx.fillStyle = qbcolor[color];
		ctx.fill();
		ctx.closePath();
	},
	
	line = function(x1, y1, x2, y2, color) {
		ctx.beginPath();
		ctx.strokeStyle = qbcolor[color];
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.closePath();
	},
	
	pset = function(x, y, color) {
		line(x, y, x, y, color);
	},
	
	rect = function(x1, y1, x2, y2, color) {
		ctx.fillStyle = qbcolor[color];
		ctx.fillRect(x1, y1, x2, y2);
	},
	
	cls = function() {
		rect(0, 0, width, height, 0);
	},
	
	drawShip = function(x, y, color) {
		if (shipLoaded) {
			rect(x, y, ship.width, ship.height, color);
			ctx.drawImage(ship, x, y);
		} else {
			setTimeout(function() { drawShip(x, y, color); }, 25);
		}
	},
	
	savePixelData = function() {
		pixelData = ctx.getImageData(0, 0, width, height).data;
	},
	
	point = function(x, y) {
		var index = Math.round(y * width + x) * 4, r = pixelData[index], g = pixelData[index + 1], b = pixelData[index + 2];
		return null != pixelData ? (pixelData[index] << 16) | (pixelData[index + 1] << 8) | pixelData[index + 2] : null;
	};
	
	// Load the ship image
	ship.src = 'ship.png';
	ship.onload = function() { shipLoaded = true; }
	
	return {
		width:width,
		height:height,
		circle:circle,
		line:line,
		cls:cls,
		drawShip:drawShip,
		savePixelData:savePixelData,
		point:point,
		pset:pset
	};

},

PlanetWars = (function() {

	var
	
	// Canvas surfaces
	cBg = new Graphics('bg'),
	cPlanets = new Graphics('planets'),
	cShips = new Graphics('ships'),
	cMissiles = new Graphics('missiles'),
	
	planets = [],
	players = [],
	myPlayerNumber = 0,
	lastMessage = 0,
	missile = { x:0, y:0, velX:0, velY:0, type:0, timer:null },
	explosion = { x:0, y:0, radius:0, counter:0, timer:null, delta:0 }
	
	MAX_PLANET_SIZE = 70,
	DEG_TO_RAD = Math.PI / 180,
	EXPLOSION_BASE = 25,
	FPS = 60,
	FPS_DELAY = 1000 / FPS,
	
	// Pythagoreon theorem
	distance = function(x1, y1, x2, y2) {
		var x = x1 - x2, y = y1 - y2;
		return Math.abs(Math.sqrt(x * x + y * y));
	},
	
	// Sees if two planets intersect
	objectIntersect = function(p1, p2) {
		return distance(p1.x, p1.y, p2.x, p2.y) > p1.r + p2.r;		
	},
	
	// Game initialization routines
	// -----------------------------------------------------------------------------
	createPlanet = function() {
		var planet = {
			x:Math.floor(Math.random() * cPlanets.width),
			y:Math.floor(Math.random() * cPlanets.height),
			r:Math.floor(Math.random() * MAX_PLANET_SIZE) + 10,
			c:Math.floor(Math.random() * 13) + 2
		};
		planet.m = Math.PI * planet.r * planet.r;
		return planet;
	},
	
	initPlayer = function(p) {
		p.x = Math.floor(Math.random() * (cShips.width - 40));
		p.y = Math.floor(Math.random() * (cShips.height - 20));
		return p;
	},
	
	// EXPLOSIONS
	// -----------------------------------------------------------------------------
	explode = function(x, y) {
		explosion.x = x;
		explosion.y = y;
		explosion.counter = 0;
		explosion.timer = setInterval(explodeFrame, FPS_DELAY);
	},
	
	explodeFrame = function() {
		
		var
		radius = (missile.type + 1) * EXPLOSION_BASE,
		size = radius * (explosion.counter / ((missile.type + 1) * FPS / 2)),
		color = Math.random() > .5 ? 12 : 14;
		explosion.counter++;
		
		cPlanets.circle(explosion.x, explosion.y, size, color);
		if (explosion.counter >= (missile.type + 1) * FPS / 2) {
			clearInterval(explosion.timer);
			explosion.counter = 0;
			explosion.timer = setInterval(unexplodeFrame, FPS_DELAY);
		}
		
	},
	
	unexplodeFrame = function() {
		
		var
		radius = (missile.type + 1) * EXPLOSION_BASE,
		size = radius * (explosion.counter / ((missile.type + 1) * FPS / 2));
		explosion.counter++;
		
		cPlanets.circle(explosion.x, explosion.y, size, 0);
		if (explosion.counter > (missile.type + 1) * FPS / 2) {
			clearInterval(explosion.timer);
		}
		
	},
	
	// Firing and missile commands (heh, see what I did there?)
	// -----------------------------------------------------------------------------
	
	// Calculates the new change in velocity for the missile
	calcMissile = function() {
		
		var velX, velY;
		
		for (var i in planets) {
			var
			dist = distance(planets[i].x, planets[i].y, missile.x, missile.y),
			sinX = (planets[i].x - missile.x) / dist,
			sinY = (planets[i].y - missile.y) / dist,
			f = planets[i].m / (dist * dist);
			missile.velX += f * sinX;
			missile.velY += f * sinY;
		}
		
		missile.x += missile.velX;
		missile.y += missile.velY;
		
	},
	
	fire = function(player, a, v) {
		
		// Figure whether the missile fires out the front or back of the ship
		if (a > 180 && a < 360) {
			missile.x = players[player].x - 2;
		} else {
			missile.x = players[player].x + 42;
		}
		missile.y = players[player].y + 10;
		
		// Calculate the x and y velocities based upon the angle and given velocity
		a *= DEG_TO_RAD;
		missile.velX = Math.sin(a) * v;
		missile.velY = Math.cos(a) * v;
		
		// Set the missile a firing
		missile.timer = setInterval(missileFrame, FPS_DELAY);
		
		// Save the planet layer's pixel data for collision checking
		cPlanets.savePixelData();
		
	},
	
	// Checks for a missile collision against a planet. It also draws the missile
	checkPlanetCollision = function(x1, y1, x2, y2) {
		
		var
		w = Math.abs(x1 - x2),
		h = Math.abs(y1 - y2),
		steps = Math.round(distance(x1, y1, x2, y2)),
		slopeX = (x2 - x1) / steps,
		slopeY = (y2 - y1) / steps,
		index = 0,
		color = 0,
		lastX = 0,
		lastY = 0,
		retVal = false;
		
		for (var i = 0; i < steps; i++) {
			// Get the index into the pixel data
			lastX = x1;
			lastY = y1;
			x1 += slopeX;
			y1 += slopeY;
			cMissiles.line(lastX, lastY, x1, y1, 10);
			color = cPlanets.point(Math.round(x1), Math.round(y1));
			if (color > 0) {
				explode(x1, y1);
				retVal = true;
				break;
			}
		}
		
		return retVal;
		
	},
	
	missileFrame = function() {
		
		// Calculate the new line section
		var oldX = missile.x, oldY = missile.y;
		calcMissile();
		
		// Check for intersect with planets
		if (checkPlanetCollision(oldX, oldY, missile.x, missile.y)) {
			clearInterval(missile.timer);
		}
		
	},
	
	fireClick = function(e) {
		var
		a = parseInt($('angle').value) + 90,
		v = parseInt($('speed').value);
		fire(myPlayerNumber, a, v);
	},
	
	init = function() {
		cBg.cls();
		
		// Draw some stars
		for (var i = 0; i < 100; i++) {
			var
			x = Math.floor(Math.random() * cBg.width),
			y = Math.floor(Math.random() * cBg.height),
			color = Math.random() < .5 ? 7 : 15;
			cBg.circle(x, y, 1, color);
		}
		
		// Create some planets
		var numPlanets = Math.floor(Math.random() * 20) + 1;
		for (var i = 0; i < numPlanets; i++) {
			var planet = createPlanet(), good = false;
			while (!good && planets.length > 0) {
				for (var i = 0, count = planets.length; i < count; i++) {
					good = objectIntersect(planets[i], planet);
					if (!good) {
						planet = createPlanet();
						break;
					}
				}
			}
			
			cPlanets.circle(planet.x, planet.y, planet.r, planet.c);
			planets.push(planet);

		}
		
		players.push({});
		players.push({});
		players.push({});
		for (var i = 0, count = players.length; i < count; i++) {
			players[i] = initPlayer(players[i]);
			players[i].r = 50;
			good = false;
			while (!good) {
				for (var j = 0, p_count = planets.length; j < p_count; j++) {
					good = objectIntersect(players[i], planets[j]);
					if (!good) {
						break;
					}
				}
				
				if (!good) {
					players[i] = initPlayer(players[i]);
				}
				
			}
			
			cShips.drawShip(players[i].x, players[i].y, i + 2);
			
		}
		
		// Bind event listners
		$('fire').onclick = fireClick;
		
	};
	
	// Initialize the environment
	init();

}());