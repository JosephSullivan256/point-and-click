import Vec2 from "./vec2";
import NavGraph from "./navgraph";
import Fish from "./fish";
import village from "./assets/cinqueterre.png";

/*

TODO:
- figure out what to do next!!

*/

window.addEventListener("load", ()=>{
	new Main();
});

class Main {
	constructor() {
		// time stuff
		this.current_time = Date.now();
		this.old_time = this.current_time;
		this.dt = 0;

		// events
		this.event_queue = [];
		window.addEventListener("mousedown", (e)=>{this.mousedown(e)});
		window.addEventListener("mousemove", (e)=>{this.mousemove(e)});
		window.addEventListener("mouseup", (e)=>{this.mouseup(e)});
		window.addEventListener("dblclick", (e)=>{this.dblclick(e)});
		document.getElementById("select").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"select"]);
		});
		document.getElementById("add").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"add"]);
		});
		document.getElementById("add edge").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"add edge"]);
		});
		document.getElementById("delete").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"delete"]);
		});
		document.getElementById("control").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"control"]);
		});

		// canvas stuff
		this.canvas = document.getElementById("canvas");
		this.canvas.width = 1600;
		this.canvas.height= 1200;
		this.ctx = this.canvas.getContext("2d");
		this.mat = this.ctx.getTransform();

		// test stuff
		this.nav = new NavGraph();
		this.nav.graph.addNode(0, {pos: new Vec2(120, 420)});
		this.nav.graph.addNode(1, {pos: new Vec2(240, 460)});
		this.nav.addEdge(0, 1);

		this.fish = new Fish(this.nav, 0, 1, 0.5);
		this.village = new Background(village);

		this.step();
	}

	step() {
		this.current_time = Date.now()/1000.0;
		this.dt = this.current_time - this.old_time;
		this.old_time = this.current_time;

		this.draw();
		this.update();
		// restore to default transformations (I do this now so that the matrix for the canvas is good)
		this.ctx.restore();

		window.requestAnimationFrame(()=>this.step());
	}

	update() {
		this.nav.update(this.event_queue);
		this.fish.update(this.event_queue, this.dt);

		// even though we clear the event queue here anyways, do make an effort to pop events
		// off when reacting to them, so that events aren't accepted by multiple things
		// unintentionally.
		this.event_queue.length = 0;
	}

	draw() {
		// reset canvas
		this.ctx.fillStyle = "white";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// setup initial transformations
		this.ctx.save();
		this.ctx.translate(0,-175);
		this.ctx.scale(1.5,1.5);

		this.mat = this.ctx.getTransform();

		// draw things
		this.village.draw(this.ctx);
		this.nav.draw(this.ctx);
		this.fish.draw(this.ctx);
	}

	mousedown(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mousedown"]);
	}

	mouseup(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mouseup"]);
	}

	mousemove(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mousemove"]);
	}

	dblclick(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"dblclick"]);
	}

	getCursorPositionRaw(e) {
		let rect = this.canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		return new Vec2(x,y);
	}

	getCursorPosition(e) {
		return this.getTransformed(this.getCursorPositionRaw(e));
	}

	getTransformed(v) {
		let m = this.mat;
		let det_inv = 1.0/(m.a*m.d - m.b*m.c);
		// we need to do inverse of m, which i've done by hand
		return new Vec2(
			(m.d * (v.x - m.e) - m.c * (v.y - m.f)) * det_inv,
			(-m.b * (v.x - m.e) + m.a * (v.y - m.f)) * det_inv
		);
	}
}

class Background {
	constructor(src){
		this.img = new Image();
		this.img.src = src;
	}

	draw(ctx) {
		ctx.save();

		ctx.scale(0.2, 0.2);
		ctx.drawImage(this.img, 0, 0);

		ctx.restore();
	}
}