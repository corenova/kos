import {Node} from 'kos'
import NestSchema from 'nest.yang'

NestSchema.bind('nest-config', {
  
})

export class NestNode extends NestSchema {
  static name = "nest-config"
  static schema = `
    container credentials {
	  leaf clientid { type "string" }
	}
  `

  public get label() {
	return this.account||'nest account';
  }

  

}

export class NestRequestNode extends Node {
  static name = "nest request"

}

