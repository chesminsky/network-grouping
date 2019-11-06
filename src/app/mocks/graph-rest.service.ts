import { Observable, of } from 'rxjs';
import { GraphViewData } from 'src/app/page-graph/models';

export class GraphRestService {

	public update(graphViewData: GraphViewData, withMapping = true): Observable<number> {
		return of(0);
	}

}

