import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';
import { NetElement, NetLink } from '../models/models';
import { GraphData } from '../models/models';

export interface NodeMenu {
	node: NetElementDatum;
	x: number;
	y: number;
}

export interface LinkMenu {
	link: NetLinkDatum;
	x: number;
	y: number;
}

export interface GraphViewData extends GraphData {
	networkLinks?: Array<NetLink>;
	viewData?: {
		netElementsDatum?: Array<NetElementDatum>;
		netLinksDatum?: Array<NetLinkDatum>;
	};
}

export interface NetElementDatum extends SimulationNodeDatum, NetElement {
	type: string;
	hidden?: boolean;
	highlighted?: boolean;
}

export interface NetLinkDatum extends NetLink, SimulationLinkDatum<NetElementDatum> {
	hidden?: boolean;
}