import {
  Component,
  ComponentBindings,
  JSXComponent,
  Event,
  Consumer,
  Effect,
  OneWay,
} from "@devextreme-generator/declarations";

import { Context } from "./context";
import { PluginContext } from "./context";

function view(model: PagingComponent) {
  return <div id="context-paging-value">paging:{model.props.pageIndex}</div>;
}

@ComponentBindings()
class Props {
  @OneWay() pageIndex: number = 0;
  @Event() pageIndexChange: (pageIndex: number) => void = () => void 0;
}

@Component({
  view,
})
export default class PagingComponent extends JSXComponent<Props, "pageIndex">(
  Props
) {
  @Consumer(Context)
  contextConsumer!: PluginContext;

  @Effect()
  effect() {
    this.contextConsumer.registerPlugin("paging", {
      pageIndex: this.props.pageIndex,
      setPageIndex: (pageIndex: number) => {
        this.props.pageIndex(pageIndex);
      },
    });
  }
}
