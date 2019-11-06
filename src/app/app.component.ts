import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import * as mock from './mocks/data.json';
import { GraphViewData } from './page-graph/models.js';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit{


	public data: GraphViewData;

	ngOnInit() {
		this.data = this.getData();
	}

	public getData() {
		const data: GraphViewData = (mock as any).default;

		data.viewData.netElementsDatum.forEach((ge) => {
			ge.group = this.getGroup();
		});

		/*
		data.viewData.netLinksDatum.forEach((nl) => {
			const findBy = key => data.graphElements.find((ge) => ge.id === nl[key]);
			const source = findBy('source');
			const target = findBy('target');

			const assign = ne => Object.assign({}, {id: ne.id, name: ne.name, group: ne.group});

			nl.elements = {
				source: assign(source),
				target: assign(target)
			};
		});
		*/

		console.log(data);

		return data;
	}

	private getGroup() {
		const groups = ['group 1', 'group 2', 'group 3'];
		return groups[Math.floor(Math.random() * groups.length)];
	}


}
