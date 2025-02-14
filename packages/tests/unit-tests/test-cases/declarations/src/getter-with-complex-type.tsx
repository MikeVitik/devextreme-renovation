import {
  Component,
  OneWay,
  ComponentBindings,
  InternalState,
  JSXComponent,
  Provider,
  createContext,
  Consumer
} from "@devextreme-generator/declarations";

const SimpleContext = createContext<number>(5);

function view(viewModel: Widget) {
  return <div></div>;
}

@ComponentBindings()
export class Props {
  @OneWay() p: number = 10;
}

@Component({
  view: view,
  jQuery: { register: true },
})
export default class Widget extends JSXComponent<Props>() {
  @InternalState() i: number = 10;
  @Provider(SimpleContext)
  get provide() {
    return this.i
  }
  @Consumer(SimpleContext)
  cons!: number;
  get g1(): number[] {
    return [this.props.p, this.i];
  }

  get g2(): number {
    return this.props.p;
  }

  get g3(): number {
    return this.i;
  }

  get g4(): number[] {
    return [this.cons]
  }
}
