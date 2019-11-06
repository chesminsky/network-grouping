import { Subject } from 'rxjs';
import { TopologyTreeFlatNode } from '../models/models';

export class TopologyTreeService {

	draggedNode$ = new Subject<{ node: TopologyTreeFlatNode; coords: { x: number; y: number }}>();

}
