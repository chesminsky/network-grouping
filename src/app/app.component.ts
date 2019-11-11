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
			ge.level = this.getLevel();
		});

		console.log(data);

		return data;
	}

	private getLevel() {
		const levels = 3;
		return Math.ceil(Math.random() * levels);
	}


}
