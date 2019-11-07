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

		return data;
	}

	private getGroup() {
		const groups = ['g1', 'g2', 'g3', 'g4'];
		return groups[Math.floor(Math.random() * groups.length)];
	}


}
