import fish_standing from "./assets/fish.png";
import fish_walking0 from "./assets/fish_walk/fish0000.png";
import fish_walking1 from "./assets/fish_walk/fish0001.png";
import fish_walking2 from "./assets/fish_walk/fish0002.png";
import fish_walking3 from "./assets/fish_walk/fish0003.png";
import fish_walking4 from "./assets/fish_walk/fish0004.png";
import fish_walking5 from "./assets/fish_walk/fish0005.png";
import fish_walking6 from "./assets/fish_walk/fish0006.png";
import fish_walking7 from "./assets/fish_walk/fish0007.png";

let NSIZE = 10;
let defaultState = {
	init(fish) {
		fish.img = fish.img_standing;
	},
	update(fish, dt) {}
};

export default class Fish {
	// position of fish is given by two vertices and a weight
	constructor(nav, n1, n2, weight){
		this.img_standing = new Image();
		this.img_standing.src=fish_standing;
		this.img_walking = [];
		for(let i = 0; i<8; i++){
			this.img_walking.push(new Image());
		}
		this.img_walking[0].src=fish_walking0;
		this.img_walking[1].src=fish_walking1;
		this.img_walking[2].src=fish_walking2;
		this.img_walking[3].src=fish_walking3;
		this.img_walking[4].src=fish_walking4;
		this.img_walking[5].src=fish_walking5;
		this.img_walking[6].src=fish_walking6;
		this.img_walking[7].src=fish_walking7;
		this.img = this.img_standing;
		
		this.nav = nav;

		this.active = false;

		this.n1 = n1;
		this.n2 = n2;
		this.weight = weight;

		this.target = null;
		this.state = defaultState;
		this.facingRight = true;
	}

	setState(state){
		state.init(this);
		this.state = state;
	}

	getPos() {
		let v1 = this.nav.graph.getNodeAttributes(this.n1);
		let v2 = this.nav.graph.getNodeAttributes(this.n2);
		return v1.pos.scaledBy(1.0-this.weight).plus(v2.pos.scaledBy(this.weight));
	}

	update(eventQueue, dt){
		let i = eventQueue.length;
		while(i--){
			let [e, name] = eventQueue[i];
			if(e.changeState){
				this.active = (name==="control");
			}

			if(this.active){
				if(name==="dblclick"){
					// 1. get closest point on graph

					let [n1, n2, d2, v, weight] = this.nav.closest(e.pos);

					// 2. if distance too large, give up
					if(d2 < 30*30){
						// 3. calculate route to closest point (route is in reverse order for popping)
						this.target = v;
						let route = this.nav.calculateRoute(n1,n2,weight, this.n1,this.n2,this.weight);

						if(route !== null){
							// 4. flip n1/n2 so that increasing weight follows route
							if(route.length != 0) {
								if(this.n1 === route[route.length-1]){
									let temp_n = this.n1;
									this.n1 = this.n2;
									this.n2 = temp_n;
									this.weight = 1-this.weight;
								}
								if(n2 === route[0]){
									let temp_n = n1;
									n1 = n2;
									n2 = temp_n;
									weight = 1-weight;
								}
							} else {
								if(this.n1 != n1){
									console.log("hi")
									this.n1 = n1;
									this.n2 = n2;
									this.weight = 1-this.weight;
								}
								if(weight < this.weight){
									let temp_n = n1;
									n1 = n2;
									n2 = temp_n;
									weight = 1-weight;

									temp_n = this.n1;
									this.n1 = this.n2;
									this.n2 = temp_n;
									this.weight = 1-this.weight;
								}
							}

							// 5. set state to follow route
							this.setState(new RouteState(route, n1, n2, weight));
						}
					}
					
					eventQueue.splice(i, 1);
				}
			}
		}

		this.state.update(this, dt);
	}

	setOrientation(){
		this.facingRight = (this.nav.graph.getNodeAttributes(this.n2).pos.minus(this.nav.graph.getNodeAttributes(this.n1).pos).x >=0);
	}

	draw(ctx) {
		let pos = this.getPos();

		if(this.target){
			ctx.fillStyle = "red";
			ctx.fillRect(this.target.x - NSIZE/2, this.target.y - NSIZE/2, NSIZE, NSIZE);
		}

		ctx.save();

		ctx.translate(pos.x, pos.y);
		ctx.scale(0.15, 0.15);
		if(!this.facingRight){
			ctx.scale(-1,1);
		}
		ctx.drawImage(this.img, -this.img.width/2, 50-2*this.img.height/2);

		ctx.restore();
	}
}

let vel = 60;
class RouteState {
	constructor(route, n1, n2, weight) {
		this.route = route;
		route.unshift(n2);
		route.pop();
		this.n1 = n1;
		this.n2 = n2;
		this.weight = weight;

		this.accumulator = 0;
	}

	init(fish) {
		fish.setOrientation();
	}

	update(fish, dt) {
		if(this.route.length>=1){
			if(fish.weight<1){
				this.step(fish,dt);
			} else {
				fish.weight = 0;
				let old_n = fish.n2;
				fish.n2 = this.route[this.route.length-1];
				fish.n1 = old_n;
				this.route.pop();
				fish.setOrientation();
			}
		} else {
			if(fish.weight < this.weight){
				this.step(fish,dt)
			} else {
				fish.setState(defaultState);
			}
		}
	}

	step(fish, dt) {
		fish.weight += vel*dt/fish.nav.graph.getEdgeAttributes(fish.n1,fish.n2).weight
		fish.weight = Math.min(fish.weight, 1.0);

		this.accumulator += 6*dt;
		if(this.accumulator>=8){
			this.accumulator = 0;
		}
		fish.img = fish.img_walking[Math.floor(this.accumulator)]
	}
}