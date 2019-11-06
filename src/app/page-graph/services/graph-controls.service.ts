import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { NodeMenu, LinkMenu } from '../models';
import { MetricByPort } from '../../models/models';

@Injectable()
export class GraphControlsService {

	// top menu
	public showClouds$ = new BehaviorSubject<boolean>(true);
	public refresh$ = new Subject<void>();
	public save$ = new Subject<{ withAttrs: boolean }>();
	public graphName$ = new Subject<string>();

	// zoom
	public zoom$ = new Subject<number>();
	public zoomLevel$ = new BehaviorSubject<number>(1);

	// context node menu
	public nodeMenu$ = new Subject<NodeMenu>();
	public cloudMenu$ = new Subject<NodeMenu>();
	public deleteNode$ = new Subject<void>();

	// context link menu
	public linkMenu$ = new Subject<LinkMenu>();

	// link chart
	public linkChart$ = new Subject<{ data: MetricByPort, left?: number, top?: number}>();

	// graph
	// �������� ��������� ��� detectChanges() ����������
	public spinner$ = new Subject<boolean>();

}

