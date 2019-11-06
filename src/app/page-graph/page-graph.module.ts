import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GraphChartComponent } from './components/graph-chart/graph-chart.component';
import { GraphControlsService } from './services/graph-controls.service';
import { RouterModule } from '@angular/router';

@NgModule({
	declarations: [
		GraphChartComponent,
	],
	imports: [
		CommonModule,
		RouterModule
	],
	providers: [
		GraphControlsService
	],
	exports: [
		GraphChartComponent
	]
})
export class PageGraphModule {
}
