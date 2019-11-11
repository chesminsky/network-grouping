export interface Graph {
	id?: number;
	name: string; // Название графа
	relatedId?: number; // Id элемента, к которому привязан граф
	vendor?: string[]; // Поставщик устройств, для которых работает шаблон
	techSegment?: string[]; // Сегмент устройств, для которых работает шаблон
	typePo?: string; // Наименование ПО устройств
	model?: string; // Модель устройства
	regionId?: number[]; // Id региона
}

export interface GraphData {
	graph: Graph;
	graphElements: Array<NetElement>;
}

export interface NetElement {
	id: number;
	graphElementType: string;
	name: string;
	techSegment: string;
	eventCount?: number;
	severity?: number;
	ports: Array<NetElementPort>;
	level: number;
	viewAttr?: {
		fx: number;
		fy: number;
		vx: number;
		vy: number;
		x: number;
		y: number;
	};
}

export interface NetElementPort {
	id: number;
	name?: string;
	techSegment?: string;
}

export interface NetLink {
	loadStatusByMetricDescType: {[index: number] : {loadingPercent: number, status: string}};
	portA: NetElementPort;
	portB: NetElementPort;
}
export interface NetElementFilter {
	filter?: TopologyFilter;
	newIds?: number[];
	existedElements?: Array<NetElement>;
	interconnectionsCount?: number;
}

export interface ClusterFilter {
	clusterId: number;
	filter?: TopologyFilter;
}

export interface NetLinkFilter {
	elementsFilter: TopologyFilter;
	startDate: string;
	endDate: string;
	metricDescTypeId: number[];
	portId?: number[];
}

export interface TopologyFilter {
	name?: string;
	regions?: number[];
	po?: string;
	model?: string;
	vendors?: string[];
	techSegments?: string[];
}

export interface MetricByPort {
	chartId: number;
	name: string;
	title: string;
	attrs: any;
	metrics: Metric[];
	period: string;
	elementId: number;
}

interface MetricType {
	id: number;
	code: string;
	description: string;
	sourceId: number;
	lifetimeId: number;
	unitId: number;
	executeInterval: number;
}

interface Trigger {
	id: number;
	triggerValue: number;
	triggerType: string;
	description?: any;
	status?: any;
	value?: any;
	severityId: number;
	error?: any;
	type?: any;
	recoveryMode?: any;
	manualClose?: any;
	switchPo?: any;
	switchModel?: any;
	switchVendor: any[];
	switchSegment: any[];
	metricDescriptorTypeId: number;
}

interface Metric {
	metricElementId: number;
	type: MetricType;
	attrs: any;
	values: { [key: string]: number };
	predictedValues: { [key: string]: number };
	triggers: Trigger[];
}

export interface TopologyTreeNode {
	children?: TopologyTreeNode[];
	size?: number;
	data: TopologyTreeData;
}

export interface TopologyTreeFlatNode extends TopologyTreeNode {
	expandable: boolean;
	topologyType: TopologyType;
	parentSelected?: boolean;
	childrenIds?: number[];
}

export interface TopologyTreeData {
	id: number;
	name: string;
	externalId: number;
	topologyType: TopologyType;
	key?: string;
	typePo?: string;
	type?: string;
	model?: string;
	vendor?: string;
	ip?: string;
	hostId?: number;
	latitude?: number;
	longitude?: number;
}

export enum TopologyType {
	'ROOT',
	'REGION',
	'STAND',
	'SWITCH',
	'PORT',
	'QUEUE'
}
