import { Component } from '@angular/core';
import * as data from './mocks/data.json';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	public data = (data as any).default;
}
