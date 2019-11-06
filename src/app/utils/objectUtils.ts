export class ObjectUtils {

	public static cloneObject(oldObj: any) {
		let newObj = oldObj;
		if (oldObj && typeof oldObj === 'object') {
			if (oldObj instanceof Date) {
				return new Date(oldObj.getTime());
			}
			newObj = Object.prototype.toString.call(oldObj) === '[object Array]' ? [] : {};
			for (const prop in oldObj) {
				if (oldObj.hasOwnProperty(prop)) {
					newObj[prop] = this.cloneObject(oldObj[prop]);
				}
			}
		}
		return newObj;
	}

}
