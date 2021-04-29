import { createPortal } from "preact/compat";
function view(model: Widget) {
  return (
    <div>
      {model.rendered ? (
        <Portal container={document.body}>
          <span></span>
        </Portal>
      ) : null}

      <Portal container={model.props.someRef?.current}>
        <span></span>
      </Portal>
    </div>
  );
}

export declare type WidgetPropsType = {
  someRef?: any;
};
export const WidgetProps: WidgetPropsType = {};
import * as Preact from "preact";
import { RefObject } from "preact";
import { useState, useCallback, useEffect } from "preact/hooks";

declare type PortalProps = {
  container?: HTMLElement | null;
  children: any;
};
const Portal = ({ container, children }: PortalProps): any => {
  if (container) {
    return createPortal(children, container);
  }
  return null;
};

declare type RestProps = {
  className?: string;
  style?: { [name: string]: any };
  key?: any;
  ref?: any;
};
interface Widget {
  props: typeof WidgetProps & RestProps;
  rendered: boolean;
  restAttributes: RestProps;
}

const Widget: React.FC<typeof WidgetProps & RestProps> = (props) => {
  const [__state_rendered, __state_setRendered] = useState<boolean>(false);

  const __restAttributes = useCallback(
    function __restAttributes(): RestProps {
      const { someRef, ...restProps } = props;
      return restProps;
    },
    [props]
  );
  useEffect(() => {
    __state_setRendered((__state_rendered) => true);
  }, []);

  return view({
    props: { ...props },
    rendered: __state_rendered,
    restAttributes: __restAttributes(),
  });
};

Widget.defaultProps = {
  ...WidgetProps,
};

export default Widget;
