import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { NetElementDatum, NetLinkDatum, GraphViewData } from '../../models';
import { Selection, Simulation, ZoomBehavior, ScaleLinear, Axis, ZoomTransform } from 'd3';
import { SEVERITY_ARRAY } from '../../../mocks/severity';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { GraphControlsService } from '../../services/graph-controls.service';
import { GraphRestService } from '../../../mocks/graph-rest.service';
import { ROUTING_CONFIG } from '../../../mocks/config-routing';
import { TopologyService } from '../../../mocks/topology.service';
import { ObjectUtils } from '../../../utils/objectUtils';
import { TopologyTreeService } from '../../../mocks/topology-tree.service';

@Component({
	selector: 'pm-graph-chart',
	template: '',
	styles: [':host { display: block; height: 100%; }'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraphChartComponent implements OnDestroy, OnChanges {

	// data
	private netElementsDatum: Array<NetElementDatum> = [];
	private netLinksDatum: Array<NetLinkDatum> = [];
	@Input()
	private graphData: GraphViewData;

	// graph
	private width: number;
	private height: number;
	private svg: Selection<SVGElement, any, any, any>;
	private graph: Selection<SVGGElement, any, any, any>;
	private links: Selection<SVGGElement, any, any, any>;
	private nodes: Selection<SVGGElement, any, any, any>;
	private simulation: Simulation<NetElementDatum, NetLinkDatum>;
	private xScale: ScaleLinear<number, number>;
	private yScale: ScaleLinear<number, number>;
	private xAxis: Axis<number | { valueOf(): number; }>;
	private yAxis: Axis<number | { valueOf(): number; }>;
	private gX: Selection<SVGGElement, any, any, any>;
	private gY: Selection<SVGGElement, any, any, any>;
	private icons: { [key: string]: SVGSVGElement } = {};
	private zoom: ZoomBehavior<Element, unknown>;

	// misc
	private showClouds: boolean;
	private selectedId: number = null;
	private routeSub: Subscription;
	private chartSubs: Subscription[];
	private newgraphDataUrl = ROUTING_CONFIG.settings.graphs.new.fullUrl;
	private iconsPromise: Promise<Array<Document>>;
	private initialCoords: { x: number; y: number; };
	private zoomTransform: ZoomTransform = d3.zoomIdentity;

	constructor(
		private elemRef: ElementRef,
		private router: Router,
		private controls: GraphControlsService,
		private graphRestService: GraphRestService,
		private topologyService: TopologyService,
		private treeService: TopologyTreeService,
	) {
		this.tick = this.tick.bind(this);
		this.iconsPromise = this.loadIcons();
	}

	public loadIcons(): Promise<Array<Document>> {
		const promises = [];
		for (const name of ['router', 'cloud', 'rrn']) {
			const docPromise = d3.svg(`assets/icons/graph/${name}.svg`);
			docPromise.then((d) => {
				this.icons[name] = d.querySelector('svg');
			});
			promises.push(docPromise);
		}
		return Promise.all(promises);
	}

	public ngOnChanges() {
		this.iconsPromise.then(() => {
			// clean old simulation end listener
			if (this.simulation) {
				this.simulation.on('end', null);
			}
			this.buildChart();
			this.chartEvents();
		});
	}

	public ngOnDestroy() {

		if (this.routeSub) {
			this.routeSub.unsubscribe();
		}

		if (this.chartSubs) {
			this.chartSubs.forEach((s) => s.unsubscribe());
		}
	}

	/**
	 * Показ/скрытие узлов и связей
	 */
	public checkVisibility() {
		this.links.each((d) => {
			['source', 'target'].forEach((key) => {
				if (d[key].type === 'cloud') {
					d[key].hidden = !this.showClouds;
				}
			});

			d.hidden = d.source.hidden || d.target.hidden;
		});

		const toggle = (d) => d.hidden ? 'none' : 'initial';
		this.nodes.attr('display', toggle);
		this.links.attr('display', toggle);
	}

	@HostListener('document:keydown.delete', ['$event'])
	public onDelete() {
		this.removeNodes(this.selectedId);
		this.unselectAll();
	}

	@HostListener('document:click')
	public onDocumentClick() {
		this.unselectAll();
	}

	@HostListener('window:resize')
	public onResize() {
		this.buildChart();
	}

	/**
	 * Построение графика
	 */
	public buildChart() {
		const graphData: GraphViewData = ObjectUtils.cloneObject(this.graphData);
		this.netElementsDatum = graphData.viewData.netElementsDatum;
		this.netLinksDatum = graphData.viewData.netLinksDatum;
		const container = this.elemRef.nativeElement;
		const bounding = container.getBoundingClientRect();
		this.width = bounding.width;
		this.height = bounding.height;
		container.innerHTML = '';
		// this.netLinksDatum.forEach(l => console.log(l.loadStatusByMetricDescType))

		this.svg = d3.select(container)
			.append('svg')
			.html('')
			.attr('width', this.width)
			.attr('height', this.height);

		this.initGrid();
		this.graph = this.svg.append('g');
		this.links = this.initLinks();
		this.nodes = this.initNodes();

		this.simulation = this.simulateForce();
		this.initZoom();
		this.initDragging();
		this.addStyles();
		this.checkVisibility();
	}

	/**
	 * Обработка событий меню
	 */
	private chartEvents() {
		if (this.chartSubs) {
			return;
		}

		this.chartSubs = [
			this.controls.showClouds$.subscribe((showClouds: boolean) => {
				this.showClouds = showClouds;
				this.checkVisibility();
			}),
			this.controls.zoom$.subscribe((k: number) => {
				this.zoom.scaleBy(this.svg.transition().duration(300), k);
			}),
			this.controls.deleteNode$.subscribe(() => {
				this.onDelete();
			}),
			this.controls.save$.subscribe((opts: { withAttrs: boolean}) => {
				this.saveGraphCoordinates();
				if (opts.withAttrs) {
					this.router.navigate([this.newgraphDataUrl]);
				} else {
					this.graphRestService.update(this.graphData).subscribe((id) => {
						this.router.navigate(['topology', 'graph', id]);
					});
				}
			}),
			this.topologyService.leftPanelResized.subscribe(() => {
				this.buildChart();
			}),
			this.treeService.draggedNode$.subscribe((event) => {
				this.initialCoords = {
					x: this.zoomTransform.invertX(event.coords.x),
					y: this.zoomTransform.invertY(event.coords.y)
				};
			})
		];
	}

	/**
	 * Удалить выбранные узлы
	 * @param toRemoveId - массив id узлов для удаления
	 */
	private removeNodes(toRemoveId: number) {

		if (toRemoveId === null) {
			return;
		}

		const index = this.netElementsDatum.findIndex((ne) => {
			return toRemoveId === ne.id;
		});

		const removedElement = this.netElementsDatum[index];
		removedElement.hidden = true;

		// remove node
		this.netElementsDatum.splice(index, 1);
		this.nodes.filter((d) => d.id === toRemoveId).remove();

		// cloud of removed element
		const cloudOfRemovedNode = this.netElementsDatum.find((ne) => ne.type === 'cloud' && ne.techSegment === removedElement.techSegment);
		cloudOfRemovedNode.hidden = false;

		// make links to cloud
		this.netLinksDatum.forEach((nl) => {
			if (nl.source === removedElement) {
				nl.source = cloudOfRemovedNode;
			}
			if (nl.target === removedElement) {
				nl.target = cloudOfRemovedNode;
			}
		});

		// remove wrong links
		let i = this.netLinksDatum.length;
		while (i--) {
			if (this.netLinksDatum[i].source === this.netLinksDatum[i].target) {
				this.netLinksDatum.splice(i, 1);
			}
		}

		this.tick();
		this.checkVisibility();
	}

	/**
	 * Выбор элемента
	 */
	private selectNode(node, x, y, elem) {
		this.unselectAll();
		this.selectedId = node.id;
		d3.selectAll('.node-selection').attr('display', 'none');
		d3.select(elem).select('.node-selection').attr('display', 'initial');
		this.controls.nodeMenu$.next({ node, x, y });
	}

	private selectCloud(node, x, y, elem) {
		this.unselectAll();
		this.selectedId = node.id;
		d3.selectAll('.node-selection').attr('display', 'none');
		d3.select(elem).select('.node-selection').attr('display', 'initial');
		this.controls.cloudMenu$.next({ node, x, y });
	}

	/**
	 * Выбор линка
	 */
	private selectLink(d, x, y) {
		this.unselectAll();
		this.controls.linkMenu$.next({ link: d, x, y });
	}

	/**
	 * Снятие выбора элемента
	 */
	private unselectNode() {
		d3.selectAll('.node-selection').attr('display', 'none');
		this.selectedId = null;
		this.controls.nodeMenu$.next(null);
		this.controls.cloudMenu$.next(null);
	}

	/**
	 * Снятие выбора линка
	 */
	private unselectLink() {
		this.controls.linkMenu$.next(null);
		this.controls.linkChart$.next({ data: null });
	}

	private unselectAll() {
		this.unselectLink();
		this.unselectNode();
	}

	/**
	 * Построение сетки
	 */
	private initGrid() {

		this.xScale = d3.scaleLinear()
			.domain([-this.width / 2, this.width / 2])
			.range([0, this.width]);

		this.yScale = d3.scaleLinear()
			.domain([-this.height / 2, this.height / 2])
			.range([0, this.height]);

		this.xAxis = d3.axisBottom(this.xScale)
			.ticks(this.width / this.height * 20)
			.tickSize(this.height)
			.tickPadding(0);

		this.yAxis = d3.axisRight(this.yScale)
			.ticks(20)
			.tickSize(this.width)
			.tickPadding(0);

		this.gX = this.svg.append('g')
			.attr('class', 'axis axis--x')
			.call(this.xAxis);

		this.gY = this.svg.append('g')
			.attr('class', 'axis axis--y')
			.call(this.yAxis);
	}

	/**
	 * Построение связей между узлами
	 */
	private initLinks(): Selection<SVGGElement, any, any, any> {

		const statuses = {
			INAPPLICABLE: '#CCC',
			OK: '#2E7D32',
			WARNING: '#FDD835',
			CRITICAL: '#C62828'
		};

		const links = this.graph.selectAll('.link')
			.data(this.netLinksDatum)
			.enter()
			.append('g')
			.attr('class', 'link');

		links
			.append('line')
			.style('stroke', (d) => statuses[d.loadStatusByMetricDescType[Object.keys(d.loadStatusByMetricDescType)[0]].status])
			.style('stroke-width', '2px');

		// fake line for better clicks UX
		links
			.append('line')
			.style('stroke', 'transparent')
			.style('stroke-width', '10px')
			.on('click', (d) => {
				d3.event.stopPropagation();
				this.selectLink(d, d3.event.pageX, d3.event.pageY);
			});

		return links;

	}

	/**
	 * Построение узлов
	 */
	private initNodes(): Selection<SVGGElement, any, any, any> {

		const nodes = this.graph.selectAll('.node')
			.data(this.netElementsDatum)
			.enter()
			.append('g')
			.attr('class', (d) => {
				let className = `node node--${d.type}`;
				if (d.highlighted) {
					className += ' node--highlighted';
				}
				return className;
			})
			.on('click', (d, i, g) => {
				d3.event.stopPropagation();
				if (d.type === 'cloud') {
					this.selectCloud(d, d3.event.pageX, d3.event.pageY, g[i]);
				} else {
					this.selectNode(d, d3.event.pageX, d3.event.pageY, g[i]);
				}
			});


		const getIcon = (i: number): SVGSVGElement => {
			const { type, severity, techSegment } = this.netElementsDatum[i];
			const techSegmentsIcons = ['RRN'];
			let icon;
			if (type === 'router' && techSegmentsIcons.includes(techSegment)) {
				icon = this.icons[techSegment.toLowerCase()];
			} else {
				icon = this.icons[type];
			}
			const node = icon.cloneNode(true) as SVGSVGElement;
			const colorNode = node.querySelector('#fill');
			if (colorNode) {
				colorNode.setAttribute('fill', SEVERITY_ARRAY[severity]);
			}
			return node;
		};

		const getIconWidth = (type: string) => this.icons[type].width.baseVal.value;
		const getIconHeight = (type: string) => this.icons[type].height.baseVal.value;

		// node icon
		nodes.append('g')
			.attr('transform', (d) => {
				return `translate(${-getIconWidth(d.type) / 2}, ${-getIconHeight(d.type) / 2})`;
			})
			.nodes()
			.forEach((node, i) => node.appendChild(getIcon(i)));

		// node name and event count
		const textGroup = nodes.append('text');

		textGroup.append('tspan')
			.attr('y', (d) => -getIconHeight(d.type) / 2 - 8)
			.text((d) => d.name);

		textGroup.append('tspan')
			.lower()
			.filter((d) => d.eventCount > 0)
			.attr('y', (d) => -getIconHeight(d.type) / 2 - 8)
			.attr('fill', '#B00020')
			.text((d) => d.eventCount + ' ');

		const textWidths = textGroup.nodes().map((n) => n.getBBox().width);
		textGroup.nodes().forEach((elem, i) => elem.setAttribute('transform', `translate(${-textWidths[i] / 2}, 0)`));

		// text bg
		nodes.append('rect')
			.lower()
			.attr('width', (d, i) => textWidths[i])
			.attr('height', 18)
			.attr('fill', 'white')
			.attr('y', (d) => -getIconHeight(d.type) / 2 - 21)
			.attr('x', (d, i) => -textWidths[i] / 2);

		// node selection
		nodes.append('rect')
			.attr('class', 'node-selection')
			.attr('width', (d, i) => textWidths[i] + 10)
			.attr('height', 80)
			.attr('stroke', '#0091EA')
			.attr('stroke-width', '2px')
			.attr('fill', 'transparent')
			.attr('display', 'none')
			.attr('y', -50)
			.attr('x', (d, i) => -textWidths[i] / 2 - 5);

		if (this.initialCoords) {
			this.netElementsDatum.forEach((d) => {
				if (!d.fx && !d.fy) {
					d.x = this.initialCoords.x;
					d.y = this.initialCoords.y;
				}
			});
			this.initialCoords = null;
		}
		return nodes;
	}

	/**
	 * Запустить симуляцию
	 */
	private simulateForce(): Simulation<NetElementDatum, NetLinkDatum> {
		const NODE_RADIUS = 60;
		const CHARGE_STRENGTH = 100;
		const ALPHA_DECAY = .1;

		const linkForce = d3.forceLink(this.netLinksDatum).id((d: NetElementDatum) => String(d.id));
		const collideForce = d3.forceCollide(NODE_RADIUS);
		const attractForce = d3.forceManyBody().strength(CHARGE_STRENGTH * 3).distanceMin(NODE_RADIUS * 20);
		const repelForce = d3.forceManyBody().strength(-CHARGE_STRENGTH).distanceMax(NODE_RADIUS * 5).distanceMin(NODE_RADIUS);
		const allDynamic = this.netElementsDatum.every((ne) => !ne.fx && !ne.fy);
		const centerForce = allDynamic ? d3.forceCenter(this.width / 2, this.height / 2) : null; // not needed in static graph

		return d3.forceSimulation(this.netElementsDatum)
				 .alphaDecay(ALPHA_DECAY)
				 .force('link', linkForce)
				 .force('attractForce', attractForce)
				 .force('repelForce', repelForce)
				 .force('collide', collideForce)
				 .force('center', centerForce)
				 .on('tick', this.tick)
				 .on('end', () => {
					 this.fixCoordinates();
					 this.saveGraphCoordinates();
				 });
	}

	/**
	 * Сохранение текущих координат для графа
	 */
	private saveGraphCoordinates() {
		this.graphData.viewData.netElementsDatum = this.netElementsDatum;
		this.graphData.viewData.netLinksDatum = this.netLinksDatum.map((nl) => {
			return {
				...nl,
				source: (nl.source as NetElementDatum).id,
				target: (nl.target as NetElementDatum).id
			};
		});

		sessionStorage.setItem('graphData', JSON.stringify(this.graphData));
	}

	/**
	 * Обновление координат линков и элементов
	 */
	private tick() {

		const getPos = (key: string, axis: string) => (d: NetLinkDatum) => {
			return (d[key] as NetElementDatum)[axis];
		};

		this.links.selectAll('line')
			.attr('x1', getPos('source', 'x'))
			.attr('y1', getPos('source', 'y'))
			.attr('x2', getPos('target', 'x'))
			.attr('y2', getPos('target', 'y'));

		this.nodes
			.attr('transform', (d: NetElementDatum) => {
				return `translate(${d.x}, ${d.y})`;
			});
	}

	/**
	 * Обработка событий zoom
	 */
	private initZoom() {

		this.zoom = d3.zoom().on('zoom', () => {
			this.graph.attr('transform', d3.event.transform);
			this.gX.call(this.xAxis.scale(d3.event.transform.rescaleX(this.xScale)));
			this.gY.call(this.yAxis.scale(d3.event.transform.rescaleY(this.yScale)));
			this.controls.zoomLevel$.next(d3.event.transform.k);
			this.unselectAll();
			this.zoomTransform = d3.event.transform;
		});

		this.svg.call(this.zoom).on('zoom', this.zoom).on('dblclick.zoom', null);

		this.zoom.transform(this.svg, this.zoomTransform);
	}

	/**
	 * Фиксируем координаты всех элементов
	 */
	private fixCoordinates() {
		this.nodes.each((d) => {
			d.fx = d.x;
			d.fy = d.y;
		});
	}

	/**
	 * Добавление drag-n-drop поведения
	 */
	private initDragging() {
		d3.drag()
			.on('start', () => {
				this.unselectAll();
				if (!d3.event.active) {
					this.simulation.alphaTarget(0.3).restart();
				}
				this.fixCoordinates();
			})
			.on('drag', (d: NetElementDatum) => {
				d.fx = d3.event.x;
				d.fy = d3.event.y;
			})
			.on('end', () => {
				if (!d3.event.active) {
					this.simulation.alphaTarget(0);
				}

				this.saveGraphCoordinates();
			})
			(this.nodes);
	}

	/**
	 * Кастомные стили для всего графа
	 */
	private addStyles() {

		this.svg.append('filter').attr('id', 'dropshadow').attr('height', '150%').html(`
			<feGaussianBlur in="SourceAlpha" stdDeviation="3"/> <!-- stdDeviation is how much to blur -->
			<feOffset dx="2" dy="2" result="offsetblur"/> <!-- how much to offset -->
			<feComponentTransfer>
				<feFuncA type="linear" slope="0.5"/> <!-- slope is the opacity of the shadow -->
			</feComponentTransfer>
			<feMerge>
				<feMergeNode/> <!-- this contains the offset blurred image -->
				<feMergeNode in="SourceGraphic"/> <!-- this contains the element that the filter is applied to -->
			</feMerge>
		`);

		this.svg.append('style').text(`

			.axis {
				color: transparent;
			}

			.axis line {
				stroke: #ededed;
			}

			.node {
				cursor: pointer;
			}

			.link {
				cursor: pointer;
			}

			.node--highlighted text {
				font-weight: 500;
			}

			.node--highlighted g {
				filter:url(#dropshadow);
			}
		`);
	}

}
