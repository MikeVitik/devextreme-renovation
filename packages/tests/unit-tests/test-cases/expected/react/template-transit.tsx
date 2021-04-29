import WidgetWithTemplate from "./dx-widget-with-template";

export declare type TemplateTransitWidgetInputType = {
  templateProp?: any;
  componentTemplateProp?: any;
  renderProp?: any;
  componentProp?: any;
  componentRenderProp?: any;
  componentComponentProp?: any;
};
export const TemplateTransitWidgetInput: TemplateTransitWidgetInputType = {};
import * as React from "react";
import { useCallback, HTMLAttributes } from "react";

declare type RestProps = Omit<
  HTMLAttributes<HTMLElement>,
  keyof typeof TemplateTransitWidgetInput
>;
interface TemplateTransitWidget {
  props: typeof TemplateTransitWidgetInput & RestProps;
  restAttributes: RestProps;
}

const getTemplate = (TemplateProp: any, RenderProp: any, ComponentProp: any) =>
  (TemplateProp &&
    (TemplateProp.defaultProps
      ? (props: any) => <TemplateProp {...props} />
      : TemplateProp)) ||
  (RenderProp &&
    ((props: any) =>
      RenderProp(
        ...("data" in props ? [props.data, props.index] : [props])
      ))) ||
  (ComponentProp && ((props: any) => <ComponentProp {...props} />));

const TemplateTransitWidget: React.FC<
  typeof TemplateTransitWidgetInput & RestProps
> = (props) => {
  const __restAttributes = useCallback(
    function __restAttributes(): RestProps {
      const {
        componentComponentProp,
        componentProp,
        componentRenderProp,
        componentTemplateProp,
        renderProp,
        templateProp,
        ...restProps
      } = props;
      return restProps;
    },
    [props]
  );

  return view_1({
    props: {
      ...props,
      templateProp: getTemplate(
        props.templateProp,
        props.renderProp,
        props.componentProp
      ),
      componentTemplateProp: getTemplate(
        props.componentTemplateProp,
        props.componentRenderProp,
        props.componentComponentProp
      ),
    },
    restAttributes: __restAttributes(),
  });
};

TemplateTransitWidget.defaultProps = {
  ...TemplateTransitWidgetInput,
};

export default TemplateTransitWidget;
function view_1({
  props: { componentTemplateProp: ComponentTemplateProp, templateProp },
}: TemplateTransitWidget) {
  return (
    <WidgetWithTemplate
      template={templateProp}
      componentTemplate={ComponentTemplateProp}
    />
  );
}
function view_2(viewModel: TemplateTransitWidget) {
  const { templateProp: TemplateProp } = viewModel.props;
  const ComponentTemplateProp = viewModel.props.componentTemplateProp;
  return (
    <WidgetWithTemplate
      template={TemplateProp}
      componentTemplate={ComponentTemplateProp}
    />
  );
}
function view_3(viewModel: TemplateTransitWidget) {
  return (
    <WidgetWithTemplate
      template={viewModel.props.templateProp}
      componentTemplate={viewModel.props.componentTemplateProp}
    />
  );
}
