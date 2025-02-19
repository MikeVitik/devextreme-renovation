import path from 'path';
import {
  BaseClassMember,
  Property as BaseProperty,
  Call,
  Identifier,
  Conditional,
  Decorator,
  ObjectLiteral,
  TypeParameterDeclaration,
  SyntaxKind,
  GeneratorContext,
  toStringOptions,
  getModuleRelativePath,
  getProps,
  Component,
  BindingElement,
  BindingPattern,
  VariableStatement,
  VariableDeclaration,
  VariableDeclarationList,
  SimpleExpression,
  Expression,
  ReturnStatement,
  Block,
  SimpleTypeExpression,
  ArrayTypeNode,
  extractComplexType,
  isTypeArray,
  TypeExpression,
  Parameter,
  Function,
  capitalizeFirstLetter,
  lowerizeFirstLetter,
  processComponentContext,
  PropertyAssignment,
  ShorthandPropertyAssignment,
} from '@devextreme-generator/core';
import { GetAccessor } from './class-members/get-accessor';
import { Method } from './class-members/method';
import { getPropName, Property } from './class-members/property';
import { HeritageClause } from './heritage-clause';
import { PropertyAccess } from './property-access';
import { ComponentInput, getTemplatePropName } from './react-component-input';
import { compileGettersCompatibleExtend } from './common';

function getSubscriptions(methods: Method[]) {
  return methods
    .map((m) => {
      const [event, parameters] = m.decorators.find(
        (d) => d.name === 'Listen',
      )!.expression.arguments;

      let target: string | undefined;
      if (parameters instanceof ObjectLiteral) {
        target = parameters.getProperty('target')?.toString();
      }

      return {
        name: m.name,
        target,
        eventName: event?.toString(),
      };
    })
    .filter((s) => s.target);
}

export class ReactComponent extends Component {
  constructor(
    decorator: Decorator,
    modifiers: string[] = [],
    name: Identifier,
    typeParameters: string[],
    heritageClauses: HeritageClause[] = [],
    members: Array<Property | Method>,
    context: GeneratorContext,
  ) {
    super(
      decorator,
      modifiers,
      name,
      typeParameters,
      heritageClauses,
      members,
      context,
    );

    this.refs = this.refs.concat(
      this.members.filter((m) => m.isForwardRef) as Property[],
    );
  }

  get REF_OBJECT_TYPE(): string {
    return 'MutableRefObject';
  }

  addPrefixToMembers(members: (BaseProperty | Method)[]): (BaseProperty | Method)[] {
    return super.addPrefixToMembers(
      members.map((m) => {
        if (m instanceof Method || m.isRef || m.isForwardRef) {
          m.prefix = '__';
        }
        return m;
      }),
    );
  }

  processMembers(members: (BaseProperty | Method)[]): (BaseProperty | Method)[] {
    members = super.processMembers(members).map((p) => {
      if (p.inherited) {
        p.scope = 'props';
      }
      return p;
    });

    if (members.some((m) => m.isNested)) {
      members.push(this.createNestedChildrenGetter());
    }
    (members.filter((m) => m.isNested) as Property[]).forEach((m) => {
      if (m.initializer) {
        m.questionOrExclamationToken = SyntaxKind.QuestionToken;
      }
      members.push(this.createNestedPropertyGetter(m));
    });

    return members;
  }

  createNestedChildrenGetter(): Method {
    const statements = [
      new VariableStatement(
        undefined,
        new VariableDeclarationList(
          [
            new VariableDeclaration(
              new BindingPattern(
                [
                  new BindingElement(
                    undefined,
                    undefined,
                    new Identifier('children'),
                  ),
                ],
                'object',
              ),
              undefined,
              new PropertyAccess(
                new SimpleExpression('this'),
                new Identifier('props'),
              ),
            ),
          ],
          SyntaxKind.ConstKeyword,
        ),
      ),
      new ReturnStatement(new SimpleExpression('__collectChildren(children)')),
    ];
    const method = new Method(
      [],
      undefined,
      undefined,
      new Identifier('nestedChildren'),
      undefined,
      [new TypeParameterDeclaration(new Identifier('T'))],
      [],
      new ArrayTypeNode(new SimpleTypeExpression('T')),
      new Block(statements, true),
    );

    method.prefix = '__';

    return method;
  }

  createGetAccessor(
    name: Identifier,
    type: TypeExpression,
    block: Block,
  ): GetAccessor {
    return new GetAccessor(undefined, undefined, name, [], type, block);
  }

  createRestPropsGetter(members: BaseClassMember[]): GetAccessor {
    const props = getProps(members);
    const bindingElements = props
      .reduce((bindingElements, p) => {
        if (p._name.toString() === 'export') {
          bindingElements.push(
            new BindingElement(undefined, p._name, 'exportProp'),
          );
        } else {
          bindingElements.push(
            new BindingElement(undefined, undefined, p._name),
          );
        }
        return bindingElements;
      }, [] as BindingElement[])
      .concat([
        new BindingElement(
          SyntaxKind.DotDotDotToken,
          undefined,
          new Identifier('restProps'),
        ),
      ]);

    const statements = [
      new VariableStatement(
        undefined,
        new VariableDeclarationList(
          [
            new VariableDeclaration(
              new BindingPattern(bindingElements, 'object'),
              undefined,
              new PropertyAccess(
                new SimpleExpression('this'),
                new Identifier('props'),
              ),
            ),
          ],
          SyntaxKind.ConstKeyword,
        ),
      ),
      new ReturnStatement(new SimpleExpression('restProps')),
    ];

    return this.createGetAccessor(
      new Identifier('restAttributes'),
      new SimpleTypeExpression('RestProps'),
      new Block(statements, true),
    );
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  createNestedChildrenCollector(): Function {
    const statements = [
      new ReturnStatement(
        new SimpleExpression(`(React.Children.toArray(children)
            .filter((child) =>
              React.isValidElement(child) &&
              typeof child.type !== "string") as (React.ReactElement & { type: { propName: string } })[])
            .map(child => {
              const { children: childChildren, ...childProps } = child.props;
              const collectedChildren = {} as any;
              __collectChildren(childChildren).forEach(({ __name, ...restProps }: any) => {
                  if(__name) {
                    if(!collectedChildren[__name]) {
                      collectedChildren[__name] = [];
                    }
                    collectedChildren[__name].push(restProps);
                  }
                }
              );
              return {
                ...collectedChildren,
                ...childProps,
                __name: child.type.propName,
              }
            })`),
      ),
    ];

    return new Function(
      undefined,
      undefined,
      '',
      new Identifier('__collectChildren'),
      [new TypeParameterDeclaration(new Identifier('T'))],
      [
        new Parameter(
          [],
          [],
          '',
          new Identifier('children'),
          undefined,
          'React.ReactNode',
          undefined,
        ),
      ],
      new ArrayTypeNode(new SimpleTypeExpression('T')),
      new Block(statements, true),
      this.context,
    );
  }

  compileImportStatements(hooks: string[], compats: string[], core: string[]): string[] {
    const imports = ["import * as React from 'react'"];
    const namedImports = hooks
      .concat(compats)
      .concat(core);
    if (namedImports.length) {
      imports.push(`import {${namedImports.join(',')}} from 'react'`);
    }

    return imports;
  }

  compileApiRefImports(imports: string[]): void {
    const result: Set<string> = new Set<string>();
    if (this.apiRefs.length) {
      this.apiRefs.forEach((ref) => {
        const refType = ref.compileRefType();
        const baseComponent = this.context.components![
          refType
        ] as ReactComponent;
        if (this.context.dirname) {
          const relativePath = getModuleRelativePath(
            this.context.dirname,
            baseComponent.context.path!,
          );
          result.add(
            `import {${
              baseComponent.name
            }Ref as ${refType}Ref} from "${this.processModuleFileName(
              relativePath.replace(path.extname(relativePath), ''),
            )}"`,
          );
        }
      });
      imports.splice(-1, 0, ...result);
    }
  }

  compileImports(): string {
    const imports: string[] = [];
    const hooks: string[] = [];
    const compats: string[] = [];
    const core: string[] = [];

    if (
      this.internalState.length
      || this.state.length
      || this.members.some((m) => m.isProvider)
    ) {
      hooks.push('useState');
    }

    if (this.members.some((m) => m.isConsumer)) {
      hooks.push('useContext');
    }

    if (this.listeners.length || this.methods.length) {
      hooks.push('useCallback');
    }

    if (getSubscriptions(this.listeners).length || this.effects.length) {
      hooks.push('useEffect');
    }

    if (this.refs.length || this.apiRefs.length || this.mutable.length) {
      hooks.push('useRef');
    }

    if (this.members.filter((a) => a.isApiMethod).length) {
      hooks.push('useImperativeHandle');
      compats.push('forwardRef');
    }

    this.compileApiRefImports(imports);

    this.compileDefaultOptionsImport(imports);

    return imports
      .concat(this.compileImportStatements(hooks, compats, core))
      .join(';\n');
  }

  defaultPropsDest(): string {
    return `${this.name.toString()}.defaultProps`;
  }

  compileConvertRulesToOptions(rules: string | Expression): string {
    return this.state.length
      ? `__processTwoWayProps(convertRulesToOptions(${rules}))`
      : `convertRulesToOptions<${this.getPropsType()}>(${rules})`;
  }

  compileDefaultPropsObjectProperties(): string[] {
    const defaultProps = this.props
      .filter((p) => !p.inherited && p.initializer)
      .map((p) => (p as Property).defaultProps());

    if (this.defaultOptionRules && this.needGenerateDefaultOptions) {
      defaultProps.push(
        `...${this.compileConvertRulesToOptions(this.defaultOptionRules)}`,
      );
    }

    return defaultProps;
  }

  compileDefaultProps(): string {
    const baseDefaultPropsObj = this.heritageClauses
      .filter((h) => h.defaultProps.length)[0]?.defaultProps[0];
    const defaultProps = this.compileDefaultPropsObjectProperties();

    let defaultPropsObj = baseDefaultPropsObj;

    if (defaultProps.length) {
      defaultPropsObj = `{ ${defaultProps.join(',\n')} }`;
      if (baseDefaultPropsObj) {
        defaultPropsObj = compileGettersCompatibleExtend(baseDefaultPropsObj, defaultPropsObj);
      }
    }

    if (this.needGenerateDefaultOptions) {
      return `
                  ${
  this.state.length
    ? `function __processTwoWayProps(defaultProps: ${this.compilePropsType()}){
                          const twoWayProps:string[] = [${this.state.map(
    (s) => `"${s.name}"`,
  )}];

                          return Object.keys(defaultProps).reduce((props, propName)=>{
                              const propValue = (defaultProps as any)[propName];
                              const defaultPropName = twoWayProps.some(p=>p===propName) ? "default"+propName.charAt(0).toUpperCase() + propName.slice(1): propName;
                              (props as any)[defaultPropName] = propValue;
                              return props;
                          }, {});
                      }`
    : ''
}

                  ${this.defaultPropsDest()} = ${defaultPropsObj};
              `;
    }

    if (defaultPropsObj) {
      return `${this.defaultPropsDest()} = ${defaultPropsObj}`;
    }

    return '';
  }

  stateDeclaration(): string {
    return `${this.state
      .concat(this.internalState)
      .concat(this.mutable)
      .map((p) => p.toString(this.getToStringOptions()))
      .join(';\n')}`;
  }

  compileUseEffect(): string {
    const subscriptions = getSubscriptions(this.listeners);

    let subscriptionsString = '';
    if (subscriptions.length) {
      const { add, cleanup } = subscriptions.reduce(
        ({ add, cleanup }, s) => {
          (add as string[]).push(
            `${s.target}.addEventListener(${s.eventName}, ${s.name});`,
          );
          (cleanup as string[]).push(
            `${s.target}.removeEventListener(${s.eventName}, ${s.name});`,
          );
          return { add, cleanup };
        },
        { add: [], cleanup: [] },
      );

      subscriptionsString = `useEffect(()=>{
                      ${add.join('\n')}
                      return function cleanup(){
                          ${cleanup.join('\n')}
                      }
                  });`;
    }
    return (
      subscriptionsString
      + this.effects
        .map(
          (e) => `useEffect(${e.arrowDeclaration(
            this.getToStringOptions(),
          )}, [${e.getDependency({
            members: this.members,
            componentContext: SyntaxKind.ThisKeyword,
          })}])`,
        )
        .join(';\n')
    );
  }

  compileComponentRef(): string {
    const api = this.members.filter((a) => a.isApiMethod);
    if (api.length) {
      return `export type ${this.name}Ref = {${api.map((a) => a.typeDeclaration())}}`;
    }
    return '';
  }

  compileUseImperativeHandle(): string {
    const api = this.members.reduce(
      (r: { methods: string[]; deps: string[] }, a) => {
        if (a.isApiMethod) {
          r.methods.push(`${a._name}: ${a.name}`);

          r.deps = [...new Set(r.deps.concat(a.name))];
        }

        return r;
      },
      { methods: [], deps: [] },
    );

    return api.methods.length
      ? `useImperativeHandle(ref, () => ({${api.methods.join(
        ',\n',
      )}}), [${api.deps.join(',')}])`
      : '';
  }

  compileUseRef(): string {
    return this.refs
      .concat(this.apiRefs)
      .map((a) => a.toString(this.getToStringOptions()))
      .join(';\n');
  }

  compileComponentInterface(): string {
    const props = this.isJSXComponent
      ? [`props: ${this.compilePropsType()}`]
      : [];

    return `interface ${this.name}{
              ${props
    .concat(
      this.members
        .filter(
          (m) => !m.inherited
                        && !m.isEffect
                        && !m.isApiMethod
                        && !m.isPrivate
                        && !m.isMutable,
        )
        .map((m) => m.typeDeclaration()),
    )
    .join(';\n')}
          }`;
  }

  compileTemplateGetter(): string {
    return this.props.some((p) => p.isTemplate)
      ? `
          const getTemplate = (TemplateProp: any, RenderProp: any, ComponentProp: any) => (
            (TemplateProp && (TemplateProp.defaultProps ? (props: any) => <TemplateProp {...props} /> : TemplateProp)) ||
              (RenderProp &&
                ((props: any) =>
                  RenderProp(
                    ...("data" in props ? [props.data, props.index] : [props])
                  ))) ||
              (ComponentProp && ((props: any) => <ComponentProp {...props} />))
          );
      `
      : '';
  }

  processTemplates(): string[] {
    return this.props
      .filter((p) => p.isTemplate)
      .map(
        (t) => `${t.name}: getTemplate(props.${t.name}, props.${getTemplatePropName(
          t.name,
          'render',
        )}, props.${getTemplatePropName(t.name, 'component')})`,
      );
  }

  compileViewModelArguments(): string {
    const toStringOptions: toStringOptions = this.getToStringOptions();
    const compileState = (state: BaseClassMember[], context = '') => state
      .filter((s) => !s.isPrivate)
      .map((s) => {
        if (
          s._name.toString() !== s.getter(toStringOptions.newComponentContext)
        ) {
          const expression = context
            ? new PropertyAccess(
              new SimpleExpression('this'),
              new Identifier(context),
            )
            : new SimpleExpression('this');
          return new PropertyAssignment(
            s._name,
            new PropertyAccess(expression, s._name),
          );
        }
        return new ShorthandPropertyAssignment(s._name);
      })
      .map((p) => p.toString(toStringOptions));

    const state = compileState(this.state, 'props');
    const internalState = compileState(this.internalState);

    const template = this.processTemplates();

    const nestedProps = this.members
      .filter((m) => m.isNested)
      .map((n) => `${n.name}: ${n.getter()}`);

    const props = this.isJSXComponent
      ? [
        `props:{${['...props']
          .concat(state)
          .concat(template)
          .concat(nestedProps)
          .join(',\n')}}`,
      ].concat(internalState)
      : ['...props'].concat(internalState).concat(state).concat(nestedProps);

    const listenersAndRefs: BaseClassMember[] = [
      ...this.listeners,
      ...this.refs,
      ...this.apiRefs,
    ];
    const statements = props
      .concat(
        listenersAndRefs.map(
          (r) => `${r._name.toString()}:${processComponentContext(
            toStringOptions.newComponentContext,
          )}${r.name.toString()}`,
        ),
      )
      .concat(
        this.members
          .filter(
            (m) => (m.isConsumer || m.isProvider) && !(m instanceof GetAccessor),
          )
          .map((m) => (toStringOptions.newComponentContext
            ? `${m.name}:${m.getter(toStringOptions.componentContext)}`
            : m.name.toString())),
      )
      .concat(compileState(this.methods.filter((m) => !m.isPrivate)));

    return `{${statements.join(',\n')}}`;
  }

  compileRestProps(): string {
    return 'declare type RestProps = { className?: string; style?: { [name: string]: any }, key?: any, ref?: any }';
  }

  getPropsType(): string {
    if (this.isJSXComponent) {
      const type = this.heritageClauses[0].types[0];
      if (
        type.expression instanceof Call
        && type.expression.typeArguments?.length
      ) {
        return type.expression.typeArguments[0].toString();
      }

      return this.compileDefaultOptionsPropsType();
    }
    return `{${this.props
      .concat(this.state)
      .concat(this.slots)
      .map((p) => p.typeDeclaration())
      .join(',\n')}
    }`;
  }

  compilePropsType(): string {
    return this.getPropsType().concat(' & RestProps');
  }

  compileDefaultOptionsPropsType(): string {
    const heritageClause = this.heritageClauses[0];
    return `typeof ${heritageClause.propsType}`;
  }

  getToStringOptions(): toStringOptions {
    return {
      members: this.members,
      componentContext: 'this',
      newComponentContext: '',
    };
  }

  getNestedExports(component: ComponentInput, name: string, propName: string): string {
    return `export const ${name}: React.FunctionComponent<typeof ${component.name}> & { propName: string } = () => null;
      ${name}.propName="${propName}"
      ${name}.defaultProps=${component.name}`;
  }

  collectNestedComponents() {
    return super.collectNestedComponents() as {
      component: ComponentInput;
      name: string;
      propName: string;
    }[];
  }

  compileNestedComponents(): string {
    const collectedComponents = this.collectNestedComponents();
    if (collectedComponents.length) {
      const imports = this.getNestedImports(
        collectedComponents.map(({ component }) => component),
      );
      const nestedComponents = collectedComponents.map(
        ({ component, name, propName }) => this.getNestedExports(component, name, propName),
      );

      return imports.concat(nestedComponents).join('\n');
    }
    return '';
  }

  createNestedPropertyGetter(property: Property): GetAccessor {
    const propName = getPropName(property.name);
    const isArray = isTypeArray(property.type);
    const type = extractComplexType(property.type);
    const indexGetter = isArray ? '' : '?.[0]';
    const undefinedType = property.initializer ? '' : ' | undefined';

    const getterName = `__getNested${capitalizeFirstLetter(property.name)}`;
    const getterType = property.type.toString();

    const statements = [
      new VariableStatement(
        undefined,
        new VariableDeclarationList(
          [
            new VariableDeclaration(
              new BindingPattern(
                [
                  new BindingElement(
                    undefined,
                    undefined,
                    new Identifier(property.name),
                  ),
                ],
                'object',
              ),
              undefined,
              new PropertyAccess(
                new SimpleExpression('this'),
                new Identifier('props'),
              ),
            ),
            new VariableDeclaration(
              new Identifier('nested'),
              undefined,
              new SimpleExpression(
                `__nestedChildren<typeof ${type} & { __name: string }>().filter(child => child.__name === "${
                  property.name
                }")${
                  property.initializer
                    ? `.map((n) => {
                  if (
                    !Object.keys(n).some(
                      (k) => k !== "__name" && k !== "__defaultNestedValues"
                    )
                  ) {
                    return (n as any)?.__defaultNestedValues || n;
                  }
                  return n;
                });`
                    : ''
                }`,
              ),
            ),
          ],
          SyntaxKind.ConstKeyword,
        ),
      ),
      new ReturnStatement(
        new Conditional(
          new SimpleExpression(propName),
          new SimpleExpression(propName),
          new Conditional(
            new SimpleExpression('nested.length'),
            new SimpleExpression(`nested${indexGetter}`),
            new SimpleExpression(
              `${
                property.initializer
                  ? `props?.__defaultNestedValues?.${property.name}`
                  : 'undefined'
              }`,
            ),
          ),
        ),
      ),
    ];
    return new GetAccessor(
      undefined,
      undefined,
      new Identifier(getterName),
      [],
      new SimpleTypeExpression(`${getterType}${undefinedType}`),
      new Block(statements, true),
    );
  }

  compilePortalComponentCore(): string {
    return `
    declare type PortalProps = {
      container?: HTMLElement | null;
      children: React.ReactNode,
    }
    const Portal = ({ container, children }: PortalProps): React.ReactPortal | null => {
      if(container) {
        return createPortal(children, container);
      }
      return null;
    }`;
  }

  compilePortalComponent(): string {
    if (!this.containsPortal()) {
      return '';
    }
    return this.compilePortalComponentCore();
  }

  compileProviders(providers: Property[], viewCallExpression: string): string {
    return providers.reduce(
      (result, p) => `<${p.context}.Provider value={${p.getter()}}>
            ${result}
          </${p.context}.Provider>`,
      `{${viewCallExpression}}`,
    );
  }

  compileViewCall(): string {
    const viewFunction = this.context.viewFunctions?.[this.view];
    const callView = `${this.view}(
        ${
  viewFunction?.parameters.length
    ? `${this.viewModel}(
                ${this.compileViewModelArguments()}
            )`
    : ''
}
    )`;

    const providers = this.members.filter((m) => m.isProvider) as Property[];

    if (providers.length) {
      return this.compileProviders(providers, callView);
    }

    return callView;
  }

  compileDefaultOptionsMethod() {
    return super.compileDefaultOptionsMethod('[]', [
      `${this.defaultPropsDest()} = ${compileGettersCompatibleExtend(
        this.defaultPropsDest(),
        this.compileConvertRulesToOptions('__defaultOptionRules'),
      )}`,
    ]);
  }

  compileFunctionalComponentType(): string {
    return `React.FC<${this.compilePropsType()} & { ref?: React.Ref<${
      this.name
    }Ref> }> & { defaultProps: ${this.getPropsType()}}`;
  }

  compileStyleNormalizer(): string {
    const hasStyle = this.context.viewFunctions
      && Object.values(this.context.viewFunctions).some((viewFunction) => viewFunction.containsStyle());
    return hasStyle
      ? `const NUMBER_STYLES = new Set([
          "animationIterationCount",
          "borderImageOutset",
          "borderImageSlice",
          "border-imageWidth",
          "boxFlex",
          "boxFlexGroup",
          "boxOrdinalGroup",
          "columnCount",
          "fillOpacity",
          "flex",
          "flexGrow",
          "flexNegative",
          "flexOrder",
          "flexPositive",
          "flexShrink",
          "floodOpacity",
          "fontWeight",
          "gridColumn",
          "gridRow",
          "lineClamp",
          "lineHeight",
          "opacity",
          "order",
          "orphans",
          "stopOpacity",
          "strokeDasharray",
          "strokeDashoffset",
          "strokeMiterlimit",
          "strokeOpacity",
          "strokeWidth",
          "tabSize",
          "widows",
          "zIndex",
          "zoom",
        ]);
        
        const isNumeric = (value: string | number) => {
          if (typeof value === "number") return true;
          return !isNaN(Number(value));
        };
        
        const getNumberStyleValue = (style: string, value: string | number) => {
          return NUMBER_STYLES.has(style) ? value : \`\${value}px\`;
        };
        
        const normalizeStyles = (styles: unknown) => {
          if (!(styles instanceof Object)) return undefined;
        
          return Object.entries(styles).reduce((result: Record<string, string | number>, [key, value]) => {
            result[key] = isNumeric(value)
              ? getNumberStyleValue(key, value)
              : value;
            return result;
          }, {} as Record<string, string | number>)
        };`
      : '';
  }

  toString(): string {
    const getTemplateFunc = this.compileTemplateGetter();

    return `
              ${this.compileImports()}
              ${this.compileStyleNormalizer()}
              ${this.compilePortalComponent()}
              ${
  this.members.some((m) => m.isNested)
    ? this.createNestedChildrenCollector()
    : ''
}
              ${this.compileNestedComponents()}
              ${this.compileComponentRef()}
              ${this.compileRestProps()}
              ${this.compileComponentInterface()}
              ${getTemplateFunc}
              ${
  this.members.filter((m) => m.isApiMethod).length === 0
    ? `${this.modifiers.join(' ')} function ${
      this.name
    }(props: ${this.compilePropsType()}){`
    : `const ${this.name} = forwardRef<${
      this.name
    }Ref, ${this.compilePropsType()}>(function ${lowerizeFirstLetter(
      this.name,
    )}(props: ${this.compilePropsType()}, ref){`
}
                  ${this.compileUseRef()}
                  ${this.stateDeclaration()}
                  ${this.members
    .filter(
      (m) => (m.isConsumer || m.isProvider)
                        && !(m instanceof GetAccessor),
    )
    .map((m) => m.toString(this.getToStringOptions()))
    .join(';\n')}
                                          ${this.listeners
    .concat(this.methods)
    .concat(
      this.members.filter(
        (m) => m.isApiMethod,
      ) as Array<Method>,
    )
    .map(
      (m) => `const ${
        m.name
      }=useCallback(${m.declaration(
        this.getToStringOptions(),
      )}, [${m.getDependency({
        members: this.members,
        componentContext: SyntaxKind.ThisKeyword,
      })}]);`,
    )
    .join('\n')}
                  ${this.compileUseEffect()}
                  ${this.compileUseImperativeHandle()}
                  return ${this.compileViewCall()}
              ${
  this.members.filter((m) => m.isApiMethod).length === 0
    ? '}'
    : `}) as ${this.compileFunctionalComponentType()};\n${this.modifiers.join(
      ' ',
    )} ${
      this.modifiers.join(' ') === 'export'
        ? `{${this.name}}`
        : this.name
    };`
}

              ${this.compileDefaultComponentExport()}

              ${this.compileDefaultProps()}
              ${this.compileDefaultOptionsMethod()}`;
  }
}
