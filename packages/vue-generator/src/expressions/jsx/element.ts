import {
  JsxElement as BaseJsxElement,
  JsxExpression as AngularJsxExpression,
} from '@devextreme-generator/angular';
import { JsxChildExpression } from './jsx-expression';

export class JsxElement extends BaseJsxElement {
  postProcess(): { prefix: string, postfix: string } {
    return { prefix: '', postfix: '' };
  }

  createChildJsxExpression(expression: AngularJsxExpression) {
    return new JsxChildExpression(expression);
  }

  compileOnlyChildren() {
    return false;
  }

  clone() {
    return new JsxElement(
      this.openingElement.clone(),
      this.children.slice(),
      this.closingElement,
    );
  }
}
