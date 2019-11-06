import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PageGraphModule } from './page-graph/page-graph.module';
import { RouterModule } from '@angular/router';
import { GraphRestService } from './mocks/graph-rest.service';
import { TopologyService } from './mocks/topology.service';
import { TopologyTreeService } from './mocks/topology-tree.service';

@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		RouterModule.forRoot([]),
		PageGraphModule
	],
	providers: [
		GraphRestService,
		TopologyService,
		TopologyTreeService
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
