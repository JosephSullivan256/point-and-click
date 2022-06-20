import {UndirectedGraph} from 'graphology';
import dijkstra from 'graphology-shortest-path/dijkstra';

let NSIZE = 10;
export default class NavGraph {
	constructor() {
		this.graph = new UndirectedGraph();
		this.active_n = null;
		this.last_n = null;
		this.index = 10; //DEBUG
		this.state = "select";
	}

	update(eventQueue){
		let i = eventQueue.length;
		while(i--){
			let [e, name] = eventQueue[i];

			if(e.changeState){
				this.active_n = null;
				this.last_n = null;
				this.state = name;
				this.calculateWeights();
			}

			switch(this.state){
				case "select":
					if(name==="mousedown"){
						this.last_n = null;
		
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.active_n = n;
							console.log(this.active_n);
						}
		
						eventQueue.splice(i, 1);
					}
		
					if(name==="mouseup"){
						this.last_n = this.active_n;
						this.active_n = null;
		
						eventQueue.splice(i, 1);
					}
		
					if(name==="mousemove"){
						if(this.active_n){
							this.graph.getNodeAttributes(this.active_n).pos = e.pos;
							eventQueue.splice(i, 1);
						}
		
						eventQueue.splice(i, 1);
					}
					break;
				case "add":
					if(name==="mousedown"){
						this.addNode(e.pos);
						eventQueue.splice(i, 1);
					}
					break;
				case "add edge":
					if(name==="mousedown"){
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.active_n = n;
							if(this.last_n && !this.graph.hasEdge(this.last_n, this.active_n)){
								this.graph.addEdge(this.last_n, this.active_n);
							}
							this.last_n = null;
						}
		
						eventQueue.splice(i, 1);
					}
					if(name==="mouseup"){
						this.last_n = this.active_n;
						this.active_n = null;
		
						eventQueue.splice(i, 1);
					}
					break;
				case "delete":
					if(name==="mousedown"){
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.graph.dropNode(n);
						}

						eventQueue.splice(i, 1);
					}
					break;
			}
		}
	}

	calculateWeights() {
		for (let {edge, attributes: e, source, target, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			e.weight = Math.sqrt(v2.pos.minus(v1.pos).d2());
		}
	}

	closestNode(pos) {
		let nmin = null;
		let d2min = Number.POSITIVE_INFINITY;
		for (let {node: n, attributes: v} of this.graph.nodeEntries()) {
			let td = v.pos.minus(pos).d2();
			if(td <= d2min) {
				d2min = td;
				nmin = n;
			}
		}

		return [nmin, d2min];
	}

	closest(pos) {
		let n1_min = null;
		let n2_min = null;
		let d2_min = Number.POSITIVE_INFINITY;
		let v_min = null;
		let w_min = null;

		// try projecting point onto each line segment, see what is closest.
		for (let {edge, attributes, source: n1, target: n2, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			let delta = v2.pos.minus(v1.pos);
			let weight = delta.dot(pos.minus(v1.pos));
			weight /= delta.d2();

			// clamp weight to [0,1]
			weight = Math.min(Math.max(weight, 0.0), 1.0);

			// get point
			let v = v1.pos.scaledBy(1-weight).plus(v2.pos.scaledBy(weight));
			let d2 = v.minus(pos).d2();

			if(d2 <= d2_min) {
				d2_min = d2;
				n1_min = n1;
				n2_min = n2;
				v_min = v;
				w_min = weight;
			}
		}

		return [n1_min, n2_min, d2_min, v_min, w_min];
	}

	addNode(pos){
		this.graph.addNode(this.index, {pos: pos});
		return this.index++;
	}

	addEdge(n1, n2){
		let d = Math.sqrt(
			this.graph.getNodeAttributes(n2).pos
				.minus(this.graph.getNodeAttributes(n1).pos).d2()
			);
		this.graph.addEdge(n1, n2, {weight: d});
	}

	calculateRoute(n11,n12,w1, n21,n22,w2){
		let v11 = this.graph.getNodeAttributes(n11);
		let v12 = this.graph.getNodeAttributes(n12);
		let v21 = this.graph.getNodeAttributes(n21);
		let v22 = this.graph.getNodeAttributes(n22);

		let n1 = this.addNode(v11.pos.scaledBy(1-w1).plus(v12.pos.scaledBy(w1)));
		let n2 = this.addNode(v21.pos.scaledBy(1-w2).plus(v22.pos.scaledBy(w2)));
		this.addEdge(n11,n1);
		this.addEdge(n1,n12);
		this.addEdge(n21,n2);
		this.addEdge(n2,n22);

		if((n11==n21 && n12==n22) || (n11==n22 && n12==n21)) {
			this.addEdge(n1,n2);
		}

		let route = dijkstra.bidirectional(this.graph, n1, n2);
		console.log(route);
		if(route) {
			route.splice(0,1);
			route.pop();
		}

		this.graph.dropNode(n1);
		this.graph.dropNode(n2);

		return route;
	}

	draw(ctx) {
		ctx.fillStyle = "black";
		for(let {node: n, attributes: v} of this.graph.nodeEntries()){
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
			ctx.font = '12px serif';
			ctx.fillText(n,v.pos.x, v.pos.y+2*NSIZE);
		}

		if(this.active_n){
			let v = this.graph.getNodeAttributes(this.active_n);
			ctx.fillStyle = "green";
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
		}
		if(this.last_n){
			let v = this.graph.getNodeAttributes(this.last_n);
			ctx.fillStyle = "blue";
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
		}
		
		ctx.fillStyle = "black";
		for (let {edge, attributes: e, source, target, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			ctx.beginPath();
			ctx.moveTo(v1.pos.x, v1.pos.y);
			ctx.lineTo(v2.pos.x, v2.pos.y);
			ctx.stroke();

			let avg = v1.pos.plus(v2.pos).scaledBy(0.5);
			ctx.font = '12px serif';
  			ctx.fillText(
				new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(e.weight),
				avg.x, avg.y
			);
		}
	}
}