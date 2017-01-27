// Type definitions for yang-js
// Project: https://github.com/corenova/yang-js
// Definitions by: Peter Lee <https://github.com/corenova>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

declare var Yang: Yang.IYang;

declare namespace Yang {
  export interface IYang {
	new (schema: string): IExpression;
	use(...args: any[]): any;
	import(name: string): IYang;
  }
  export interface IExpression {
	locate: any;
  }
}

declare module "yang-js" {
  export = Yang;
}

declare module "*.yang" {
  let schema: any;
  export default schema;
}

declare module "node-red";
declare module "config";
