import assert from "assert";
import path from "path";

import {
  Binary,
  Block,
  Decorators,
  GeneratorContext,
  Method,
  SimpleExpression,
  toStringOptions,
} from "@devextreme-generator/core";
import generator, {
  ComponentInput,
  Property,
  ReactComponent,
} from "@devextreme-generator/react";
import {
  printSourceCodeAst as getResult,
  removeSpaces,
} from "./helpers/common";
import mocha from "./helpers/mocha";

function createComponentDecorator(parameters: { [name: string]: any }) {
  return generator.createDecorator(
    generator.createCall(
      generator.createIdentifier("Component"),
      [],
      [
        generator.createObjectLiteral(
          Object.keys(parameters).map((k) =>
            generator.createPropertyAssignment(
              generator.createIdentifier(k),
              parameters[k]
            )
          ),
          false
        ),
      ]
    )
  );
}

function createDecorator(name: string) {
  return generator.createDecorator(
    generator.createCall(generator.createIdentifier(name), [], [])
  );
}

mocha.describe("react-generator: expressions", function () {
  mocha.describe("Methods", function () {
    mocha.describe("GetAccessor", function () {
      mocha.it("type declaration with defined type", function () {
        const expression = generator.createGetAccessor(
          [],
          [],
          generator.createIdentifier("name"),
          [],
          generator.createKeywordTypeNode("string"),
          undefined
        );

        assert.strictEqual(expression.typeDeclaration(), "name:string");
      });

      mocha.it("type declaration with undefined type", function () {
        const expression = generator.createGetAccessor(
          [],
          [],
          generator.createIdentifier("name"),
          [],
          undefined,
          undefined
        );

        assert.strictEqual(expression.typeDeclaration(), "name:any");
      });

      mocha.it("JSXTemplate type", function () {
        const property = generator.createProperty(
          [
            generator.createDecorator(
              generator.createCall(
                generator.createIdentifier("Template"),
                undefined,
                undefined
              )
            ),
          ],
          undefined,
          generator.createIdentifier("template"),
          undefined,
          generator.createTypeReferenceNode(
            generator.createIdentifier("JSXTemplate"),
            [
              generator.createTypeReferenceNode(
                generator.createIdentifier("WidgetProps")
              ),
            ]
          )
        );

        assert.strictEqual(
          property.typeDeclaration(),
          "template:React.FunctionComponent<Partial<WidgetProps>>"
        );
      });

      mocha.it("JSXTemplate type with required", function () {
        const property = generator.createProperty(
          [
            generator.createDecorator(
              generator.createCall(
                generator.createIdentifier("Template"),
                undefined,
                undefined
              )
            ),
          ],
          undefined,
          generator.createIdentifier("template"),
          undefined,
          generator.createTypeReferenceNode(
            generator.createIdentifier("JSXTemplate"),
            [
              generator.createTypeReferenceNode(
                generator.createIdentifier("WidgetProps")
              ),
              generator.createLiteralTypeNode(
                generator.createStringLiteral("value | index")
              ),
            ]
          )
        );

        assert.strictEqual(
          property.typeDeclaration(),
          'template:React.FunctionComponent<Partial<Omit<WidgetProps,"value | index">> & Required<Pick<WidgetProps,"value | index">>>'
        );
      });

      mocha.it("getter is call", function () {
        const expression = generator.createGetAccessor(
          [],
          [],
          generator.createIdentifier("name"),
          [],
          generator.createKeywordTypeNode("string"),
          undefined
        );

        assert.strictEqual(expression.getter(), "name()");
      });
    });

    mocha.describe("Abstract method", function () {
      mocha.it("abstract method with modifier and without body", function () {
        const expression = generator.createMethod(
          [],
          ["abstract"],
          undefined,
          generator.createIdentifier("m"),
          undefined,
          undefined,
          [],
          undefined,
          undefined
        );

        assert.strictEqual(
          expression.toString(),
          "abstract m():any;"
        );
      });

      mocha.it("abstract method without modifier and without body", function () {
        const expression = generator.createMethod(
          [],
          [],
          undefined,
          generator.createIdentifier("m"),
          undefined,
          undefined,
          [],
          undefined,
          undefined
        );

        try {
          expression.toString();
        } catch (e) {
          assert.strictEqual(
            e.toString().split("\n")[0],
            "Error: Function implementation is missing or not immediately following the declaration.");
        }
      });

      mocha.it("abstract method with modifier and body", function () {
        const expression = generator.createMethod(
          [],
          ["abstract"],
          undefined,
          generator.createIdentifier("m"),
          undefined,
          undefined,
          [],
          undefined,
          new Block([], false)
        );

        try {
          expression.toString();
        } catch (e) {
          assert.strictEqual(
            e.toString().split("\n")[0],
            "Error: Method 'm' cannot have an implementation because it is marked abstract.");
        }
      });
    });
  });

  mocha.it("JsxElement. Fragment -> React.Fragment", function () {
    const expression = generator.createJsxElement(
      generator.createJsxOpeningElement(
        generator.createIdentifier("Fragment"),
        []
      ),
      [],
      generator.createJsxClosingElement(generator.createIdentifier("Fragment"))
    );

    assert.strictEqual(
      expression.toString(),
      "<React.Fragment ></React.Fragment>"
    );
  });

  mocha.it("JsxElement - trim string children", function () {
    const expression = generator.createJsxElement(
      generator.createJsxOpeningElement(
        generator.createIdentifier("div"),
        [],
        []
      ),
      ["   content   "],
      generator.createJsxClosingElement(generator.createIdentifier("div"))
    );

    assert.strictEqual(expression.toString(), "<div >content</div>");
  });

  mocha.it("empty expression", function () {
    const expression = generator.createJsxElement(
      generator.createJsxOpeningElement(generator.createIdentifier("div"), []),
      [generator.createJsxExpression(undefined, undefined)],
      generator.createJsxClosingElement(generator.createIdentifier("div"))
    );

    assert.strictEqual(expression.toString(), "<div ></div>");
  });

  mocha.it("JsxAttribute without initializer", function () {
    const expression = generator.createJsxAttribute(
      generator.createIdentifier("a"),
      undefined
    );
    assert.strictEqual(
      removeSpaces(expression.toString()),
      removeSpaces(`a={true}`)
    );
  });
});

function createComponent(
  inputMembers: Array<Property | Method>,
  componentMembers: Array<Property | Method> = [],
  parameters: { [name: string]: any } = {}
): ReactComponent {
  generator.createClassDeclaration(
    [
      generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("ComponentBindings"),
          []
        )
      ),
    ],
    [],
    generator.createIdentifier("Input"),
    [],
    [],
    inputMembers
  );

  const heritageClause = generator.createHeritageClause(
    generator.SyntaxKind.ExtendsKeyword,
    [
      generator.createExpressionWithTypeArguments(
        [
          generator.createTypeReferenceNode(
            generator.createIdentifier("Input"),
            undefined
          ),
        ],
        generator.createIdentifier("JSXComponent")
      ),
    ]
  );

  const component = generator.createClassDeclaration(
    [createComponentDecorator(parameters)],
    [],
    generator.createIdentifier("Widget"),
    [],
    [heritageClause],
    componentMembers
  );

  return component as ReactComponent;
}

mocha.describe("React Component", function () {
  this.beforeEach(() => {
    generator.setContext({});
  });
  this.afterEach(() => {
    generator.setContext(null);
  });

  mocha.describe("View", function () {
    mocha.it("Can destruct template and slot", function () {
      const component = createComponent([
        generator.createProperty(
          [createDecorator(Decorators.Template)],
          [],
          generator.createIdentifier("template")
        ),
        generator.createProperty(
          [createDecorator(Decorators.Slot)],
          [],
          generator.createIdentifier("children")
        ),
        generator.createProperty(
          [createDecorator(Decorators.OneWay)],
          [],
          generator.createIdentifier("p")
        ),
      ]);

      const view = generator.createArrowFunction(
        [],
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createObjectBindingPattern([
              generator.createBindingElement(
                undefined,
                generator.createIdentifier("props"),
                generator.createObjectBindingPattern([
                  generator.createBindingElement(
                    undefined,
                    undefined,
                    generator.createIdentifier("template"),
                    undefined
                  ),
                  generator.createBindingElement(
                    undefined,
                    undefined,
                    generator.createIdentifier("children"),
                    undefined
                  ),
                  generator.createBindingElement(
                    undefined,
                    undefined,
                    generator.createIdentifier("p"),
                    undefined
                  ),
                ]),
                undefined
              ),
            ]),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.SyntaxKind.EqualsGreaterThanToken,
        generator.createJsxElement(
          generator.createJsxOpeningElement(
            generator.createIdentifier("div"),
            [],
            []
          ),
          [
            generator.createJsxSelfClosingElement(
              generator.createIdentifier("template"),
              [],
              []
            ),
            generator.createJsxExpression(
              undefined,
              generator.createIdentifier("children")
            ),
            generator.createJsxExpression(
              undefined,
              generator.createIdentifier("p")
            ),
          ],
          generator.createJsxClosingElement(generator.createIdentifier("div"))
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`
                ({props:{children,p,template}}:Widget) =>
                    <div >{template({})}
                    {children}
                    {p}</div>
            `)
      );
    });

    mocha.it("Can rename template in destruct object", function () {
      const component = createComponent([
        generator.createProperty(
          [createDecorator(Decorators.Template)],
          [],
          generator.createIdentifier("template")
        ),
      ]);

      const view = generator.createArrowFunction(
        [],
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createObjectBindingPattern([
              generator.createBindingElement(
                undefined,
                generator.createIdentifier("props"),
                generator.createObjectBindingPattern([
                  generator.createBindingElement(
                    undefined,
                    generator.createIdentifier("template"),
                    generator.createIdentifier("Template"),
                    undefined
                  ),
                ]),
                undefined
              ),
            ]),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.SyntaxKind.EqualsGreaterThanToken,
        generator.createJsxElement(
          generator.createJsxOpeningElement(
            generator.createIdentifier("div"),
            [],
            []
          ),
          [
            generator.createJsxSelfClosingElement(
              generator.createIdentifier("Template"),
              [],
              []
            ),
          ],
          generator.createJsxClosingElement(generator.createIdentifier("div"))
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`
                ({props:{template:Template}}:Widget) => <div >{Template({})}</div>
            `)
      );
    });

    mocha.it("Can destruct named slot", function () {
      const component = createComponent([
        generator.createProperty(
          [createDecorator(Decorators.Slot)],
          [],
          generator.createIdentifier("named")
        ),
      ]);

      const view = generator.createArrowFunction(
        [],
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createObjectBindingPattern([
              generator.createBindingElement(
                undefined,
                generator.createIdentifier("props"),
                generator.createObjectBindingPattern([
                  generator.createBindingElement(
                    undefined,
                    undefined,
                    generator.createIdentifier("named"),
                    undefined
                  ),
                ]),
                undefined
              ),
            ]),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.SyntaxKind.EqualsGreaterThanToken,
        generator.createJsxElement(
          generator.createJsxOpeningElement(
            generator.createIdentifier("div"),
            [],
            []
          ),
          [
            generator.createJsxExpression(
              undefined,
              generator.createIdentifier("named")
            ),
          ],
          generator.createJsxClosingElement(generator.createIdentifier("div"))
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`
                ({props:{named}}:Widget) => <div >{named}</div>
            `)
      );
    });

    mocha.it("Do not modify state", function () {
      const component = createComponent([
        generator.createProperty(
          [createDecorator(Decorators.TwoWay)],
          [],
          generator.createIdentifier("p")
        ),
      ]);

      const view = generator.createFunctionDeclaration(
        [],
        [],
        "",
        generator.createIdentifier("view"),
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createIdentifier("viewModel"),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.createBlock(
          [
            generator.createPropertyAccess(
              generator.createPropertyAccess(
                generator.createIdentifier("viewModel"),
                generator.createIdentifier("props")
              ),
              generator.createIdentifier("p")
            ),
          ],
          false
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`function view(viewModel:Widget){
                viewModel.props.p
            }`)
      );
    });

    mocha.it("Do not modify internal state", function () {
      const component = createComponent(
        [],
        [
          generator.createProperty(
            [createDecorator("InternalState")],
            [],
            generator.createIdentifier("p")
          ),
        ]
      );

      const view = generator.createFunctionDeclaration(
        [],
        [],
        "",
        generator.createIdentifier("view"),
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createIdentifier("viewModel"),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.createBlock(
          [
            generator.createPropertyAccess(
              generator.createIdentifier("viewModel"),
              generator.createIdentifier("p")
            ),
          ],
          false
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`function view(viewModel:Widget){
                viewModel.p
            }`)
      );
    });

    mocha.it("Access to GetAccessor as usual property", function () {
      const component = createComponent(
        [],
        [
          generator.createGetAccessor(
            [],
            [],
            generator.createIdentifier("p"),
            [],
            undefined,
            undefined
          ),
        ]
      );

      const view = generator.createFunctionDeclaration(
        [],
        [],
        "",
        generator.createIdentifier("view"),
        [],
        [
          generator.createParameter(
            [],
            [],
            undefined,
            generator.createIdentifier("viewModel"),
            undefined,
            generator.createKeywordTypeNode(component.name),
            undefined
          ),
        ],
        undefined,
        generator.createBlock(
          [
            generator.createPropertyAccess(
              generator.createIdentifier("viewModel"),
              generator.createIdentifier("p")
            ),
          ],
          false
        )
      );

      assert.strictEqual(
        getResult(view.toString()),
        getResult(`function view(viewModel:Widget){
                viewModel.p
            }`)
      );
    });

    mocha.it(
      "Template property should not be excluded from binding pattern",
      function () {
        const templateProperty = generator.createProperty(
          [createDecorator(Decorators.Template)],
          [],
          generator.createIdentifier("template")
        );

        const expression = generator.createVariableDeclaration(
          generator.createObjectBindingPattern([
            generator.createBindingElement(
              undefined,
              undefined,
              generator.createIdentifier("template"),
              undefined
            ),
          ]),
          undefined,
          generator.createPropertyAccess(
            generator.createIdentifier("viewModel"),
            generator.createIdentifier("props")
          )
        );

        const toStringOptions: toStringOptions = {
          componentContext: "viewModel",
          newComponentContext: "viewModel",
          members: [templateProperty],
        };

        const expressionString = expression.toString(toStringOptions);

        assert.strictEqual(Object.keys(toStringOptions.variables!).length, 0);
        assert.strictEqual(expressionString, "{template}=viewModel.props");
      }
    );

    mocha.describe("Template transformations", function () {
      mocha.it("Do not wrap with {} if view is template call", function () {
        const component = createComponent([
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("template"),
            undefined
          ),
        ]);

        const view = generator.createFunctionDeclaration(
          [],
          [],
          "",
          generator.createIdentifier("view"),
          [],
          [
            generator.createParameter(
              [],
              [],
              undefined,
              generator.createIdentifier("viewModel"),
              undefined,
              generator.createKeywordTypeNode(component.name),
              undefined
            ),
          ],
          undefined,
          generator.createBlock(
            [
              generator.createReturn(
                generator.createJsxSelfClosingElement(
                  generator.createIdentifier("viewModel.props.template"),
                  []
                )
              ),
            ],
            false
          )
        );

        assert.strictEqual(
          getResult(view.toString()),
          getResult(`function view(viewModel:Widget){
                    return viewModel.props.template({})
                }`)
        );
      });

      mocha.it(
        "Wrap with {} if template call is single SelfClosing child expression",
        function () {
          const component = createComponent([
            generator.createProperty(
              [createDecorator(Decorators.Template)],
              [],
              generator.createIdentifier("template"),
              undefined
            ),
          ]);

          const view = generator.createFunctionDeclaration(
            [],
            [],
            "",
            generator.createIdentifier("view"),
            [],
            [
              generator.createParameter(
                [],
                [],
                undefined,
                generator.createIdentifier("viewModel"),
                undefined,
                generator.createKeywordTypeNode(component.name),
                undefined
              ),
            ],
            undefined,
            generator.createBlock(
              [
                generator.createReturn(
                  generator.createJsxElement(
                    generator.createJsxOpeningElement(
                      generator.createIdentifier("div"),
                      []
                    ),
                    [
                      generator.createJsxSelfClosingElement(
                        generator.createIdentifier("viewModel.props.template"),
                        []
                      ),
                    ],
                    generator.createJsxClosingElement(
                      generator.createIdentifier("div")
                    )
                  )
                ),
              ],
              false
            )
          );

          assert.strictEqual(
            getResult(view.toString()),
            getResult(`function view(viewModel:Widget){
                    return <div>{viewModel.props.template({})}</div>
                }`)
          );
        }
      );

      mocha.it(
        "Wrap with {} if template call is single JsxElement child expression",
        function () {
          const component = createComponent([
            generator.createProperty(
              [createDecorator(Decorators.Template)],
              [],
              generator.createIdentifier("template"),
              undefined
            ),
          ]);

          const view = generator.createFunctionDeclaration(
            [],
            [],
            "",
            generator.createIdentifier("view"),
            [],
            [
              generator.createParameter(
                [],
                [],
                undefined,
                generator.createIdentifier("viewModel"),
                undefined,
                generator.createKeywordTypeNode(component.name),
                undefined
              ),
            ],
            undefined,
            generator.createBlock(
              [
                generator.createReturn(
                  generator.createJsxElement(
                    generator.createJsxOpeningElement(
                      generator.createIdentifier("div"),
                      []
                    ),
                    [
                      generator.createJsxElement(
                        generator.createJsxOpeningElement(
                          generator.createIdentifier(
                            "viewModel.props.template"
                          ),
                          []
                        ),
                        [],
                        generator.createJsxClosingElement(
                          generator.createIdentifier("viewModel.props.template")
                        )
                      ),
                    ],
                    generator.createJsxClosingElement(
                      generator.createIdentifier("div")
                    )
                  )
                ),
              ],
              false
            )
          );

          assert.strictEqual(
            getResult(view.toString()),
            getResult(`function view(viewModel:Widget){
                    return <div>{viewModel.props.template({})}</div>
                }`)
          );
        }
      );

      mocha.it(
        "Do not wrap with {} if template call is already wrapped (not a single child expression)",
        function () {
          const component = createComponent([
            generator.createProperty(
              [createDecorator(Decorators.Template)],
              [],
              generator.createIdentifier("template"),
              undefined
            ),
          ]);

          const view = generator.createFunctionDeclaration(
            [],
            [],
            "",
            generator.createIdentifier("view"),
            [],
            [
              generator.createParameter(
                [],
                [],
                undefined,
                generator.createIdentifier("viewModel"),
                undefined,
                generator.createKeywordTypeNode(component.name),
                undefined
              ),
            ],
            undefined,
            generator.createBlock(
              [
                generator.createReturn(
                  generator.createJsxElement(
                    generator.createJsxOpeningElement(
                      generator.createIdentifier("div"),
                      []
                    ),
                    [
                      generator.createJsxExpression(
                        undefined,
                        new Binary(
                          new SimpleExpression("true"),
                          "&&",
                          generator.createJsxSelfClosingElement(
                            generator.createIdentifier(
                              "viewModel.props.template"
                            ),
                            []
                          )
                        )
                      ),
                    ],
                    generator.createJsxClosingElement(
                      generator.createIdentifier("div")
                    )
                  )
                ),
              ],
              false
            )
          );

          assert.strictEqual(
            getResult(view.toString()),
            getResult(`function view(viewModel:Widget){
                    return <div>{true && viewModel.props.template({})}</div>
                }`)
          );
        }
      );

      mocha.it("Collect all template props to single argument", function () {
        const component = createComponent([
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("template"),
            undefined
          ),
        ]);

        const view = generator.createFunctionDeclaration(
          [],
          [],
          "",
          generator.createIdentifier("view"),
          [],
          [
            generator.createParameter(
              [],
              [],
              undefined,
              generator.createIdentifier("viewModel"),
              undefined,
              generator.createKeywordTypeNode(component.name),
              undefined
            ),
          ],
          undefined,
          generator.createBlock(
            [
              generator.createReturn(
                generator.createJsxSelfClosingElement(
                  generator.createIdentifier("viewModel.props.template"),
                  [],
                  [
                    generator.createJsxAttribute(
                      generator.createIdentifier("p"),
                      generator.createJsxExpression(
                        undefined,
                        generator.createIdentifier("value1")
                      )
                    ),
                    generator.createJsxAttribute(
                      generator.createIdentifier("d"),
                      generator.createJsxExpression(
                        undefined,
                        generator.createIdentifier("'value2'")
                      )
                    ),
                    generator.createJsxSpreadAttribute(
                      generator.createIdentifier("data")
                    ),
                  ]
                )
              ),
            ],
            false
          )
        );

        assert.strictEqual(
          getResult(view.toString()),
          getResult(`function view(viewModel:Widget){
                    return viewModel.props.template({ p: value1, d: 'value2', ...data })
                }`)
        );
      });

      mocha.it(
        "Pass empty object as argument if no props passed to template (type is function with params)",
        function () {
          const component = createComponent([
            generator.createProperty(
              [createDecorator(Decorators.Template)],
              [],
              generator.createIdentifier("template"),
              undefined,
              generator.createFunctionTypeNode(
                undefined,
                [
                  generator.createParameter(
                    [],
                    [],
                    undefined,
                    generator.createIdentifier("props"),
                    undefined,
                    generator.createKeywordTypeNode("any"),
                    undefined
                  ),
                ],
                generator.createKeywordTypeNode("any")
              )
            ),
          ]);

          const view = generator.createFunctionDeclaration(
            [],
            [],
            "",
            generator.createIdentifier("view"),
            [],
            [
              generator.createParameter(
                [],
                [],
                undefined,
                generator.createIdentifier("viewModel"),
                undefined,
                generator.createKeywordTypeNode(component.name),
                undefined
              ),
            ],
            undefined,
            generator.createBlock(
              [
                generator.createReturn(
                  generator.createJsxSelfClosingElement(
                    generator.createIdentifier("viewModel.props.template"),
                    []
                  )
                ),
              ],
              false
            )
          );

          assert.strictEqual(
            getResult(view.toString()),
            getResult(`function view(viewModel:Widget){
                    return viewModel.props.template({})
                }`)
          );
        }
      );
    });

    mocha.it("getHeritageProperties", function () {
      const component = createComponent(
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.OneWay)],
            [],
            generator.createIdentifier("p1")
          ),
          generator.createProperty(
            [createDecorator(Decorators.TwoWay)],
            [],
            generator.createIdentifier("p2")
          ),
          generator.createProperty(
            [createDecorator("Event")],
            [],
            generator.createIdentifier("p3")
          ),
          generator.createProperty(
            [createDecorator(Decorators.Slot)],
            [],
            generator.createIdentifier("p4")
          ),
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("p5")
          ),
          generator.createProperty(
            [createDecorator("InternalState")],
            [],
            generator.createIdentifier("p6")
          ),
          generator.createMethod(
            [],
            [],
            "",
            generator.createIdentifier("p7"),
            "",
            undefined,
            [],
            undefined,
            generator.createBlock([], false)
          ),
          generator.createGetAccessor(
            [],
            [],
            generator.createIdentifier("p8"),
            []
          ),
        ]
      );

      assert.deepEqual(
        component.heritageProperties.map((p) => p.name.toString()),
        ["p1", "p2", "p3", "p4", "p5"]
      );
    });
  });
});

mocha.describe("import Components", function () {
  this.beforeEach(function () {
    generator.setContext({ dirname: path.resolve(__dirname) });
  });

  this.afterEach(function () {
    generator.setContext(null);
  });

  mocha.it("Get properties from heritageClause", function () {
    generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("Base"),
        undefined
      ),
      generator.createStringLiteral(
        "./test-cases/declarations/src/empty-component"
      )
    );

    const heritageClause = generator.createHeritageClause(
      generator.SyntaxKind.ExtendsKeyword,
      [
        generator.createExpressionWithTypeArguments(
          undefined,
          generator.createIdentifier("Base")
        ),
      ]
    );

    assert.deepEqual(heritageClause.defaultProps, [], "defaultProps");
  });

  mocha.it("Get properties from heritageClause", function () {
    generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("Base"),
        undefined
      ),
      generator.createStringLiteral("./test-cases/declarations/src/props")
    );

    const heritageClause = generator.createHeritageClause(
      generator.SyntaxKind.ExtendsKeyword,
      [
        generator.createExpressionWithTypeArguments(
          undefined,
          generator.createIdentifier("Base")
        ),
      ]
    );

    assert.deepEqual(
      heritageClause.defaultProps,
      ["Base.defaultProps"],
      "defaultProps"
    );
  });

  mocha.it(
    "Heritage defaultProps. Base component has defaultProps, component has not",
    function () {
      generator.createImportDeclaration(
        undefined,
        undefined,
        generator.createImportClause(
          generator.createIdentifier("Base"),
          undefined
        ),
        generator.createStringLiteral("./test-cases/declarations/src/props")
      );

      const heritageClause = generator.createHeritageClause(
        generator.SyntaxKind.ExtendsKeyword,
        [
          generator.createExpressionWithTypeArguments(
            undefined,
            generator.createIdentifier("Base")
          ),
        ]
      );

      const decorator = generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      );

      const component = new ReactComponent(
        decorator,
        [],
        generator.createIdentifier("Component"),
        [],
        [heritageClause],
        [],
        {}
      );

      assert.equal(
        getResult(component.compileDefaultProps()),
        getResult("Component.defaultProps = Base.defaultProps")
      );
    }
  );

  mocha.it(
    "Heritage defaultProps. Base component has not defaultProps, component has not",
    function () {
      generator.createImportDeclaration(
        undefined,
        undefined,
        generator.createImportClause(
          generator.createIdentifier("Base"),
          undefined
        ),
        generator.createStringLiteral(
          "./test-cases/declarations/src/empty-component"
        )
      );

      const heritageClause = generator.createHeritageClause(
        generator.SyntaxKind.ExtendsKeyword,
        [
          generator.createExpressionWithTypeArguments(
            undefined,
            generator.createIdentifier("Base")
          ),
        ]
      );

      const decorator = generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      );

      const component = new ReactComponent(
        decorator,
        [],
        generator.createIdentifier("Component"),
        [],
        [heritageClause],
        [],
        {}
      );

      assert.equal(component.compileDefaultProps(), "");
    }
  );

  mocha.it(
    "Heritage defaultProps. Base component and child component have defaultProps",
    function () {
      generator.createImportDeclaration(
        undefined,
        undefined,
        generator.createImportClause(
          generator.createIdentifier("Base"),
          undefined
        ),
        generator.createStringLiteral("./test-cases/declarations/src/props")
      );

      const heritageClause = generator.createHeritageClause(
        generator.SyntaxKind.ExtendsKeyword,
        [
          generator.createExpressionWithTypeArguments(
            undefined,
            generator.createIdentifier("Base")
          ),
        ]
      );

      const decorator = generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      );
      const childProperty = generator.createProperty(
        [
          generator.createDecorator(
            generator.createCall(
              generator.createIdentifier("OneWay"),
              undefined,
              []
            )
          ),
        ],
        undefined,
        generator.createIdentifier("childProp"),
        undefined,
        generator.createKeywordTypeNode(generator.SyntaxKind.NumberKeyword),
        generator.createNumericLiteral("10")
      );

      const component = new ReactComponent(
        decorator,
        [],
        generator.createIdentifier("Component"),
        [],
        [heritageClause],
        [childProperty],
        {}
      );

      assert.equal(
        getResult(component.compileDefaultProps()),
        getResult(
          "Component.defaultProps = Object.create(Object.prototype,Object.assign(Object.getOwnPropertyDescriptors(Base.defaultProps),Object.getOwnPropertyDescriptors({childProp:10})))"
        )
      );
    }
  );

  mocha.it(
    "Heritage defaultProps. Base component has not default props, child component has defaultProps",
    function () {
      generator.createImportDeclaration(
        undefined,
        undefined,
        generator.createImportClause(
          generator.createIdentifier("Base"),
          undefined
        ),
        generator.createStringLiteral(
          "./test-cases/declarations/src/empty-component"
        )
      );

      const heritageClause = generator.createHeritageClause(
        generator.SyntaxKind.ExtendsKeyword,
        [
          generator.createExpressionWithTypeArguments(
            undefined,
            generator.createIdentifier("Base")
          ),
        ]
      );

      const decorator = generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      );
      const childProperty = generator.createProperty(
        [
          generator.createDecorator(
            generator.createCall(
              generator.createIdentifier(Decorators.OneWay),
              undefined,
              []
            )
          ),
        ],
        undefined,
        generator.createIdentifier("childProp"),
        undefined,
        generator.createKeywordTypeNode(generator.SyntaxKind.NumberKeyword),
        generator.createNumericLiteral("10")
      );

      const component = new ReactComponent(
        decorator,
        [],
        generator.createIdentifier("Component"),
        [],
        [heritageClause],
        [childProperty],
        {}
      );

      assert.equal(
        getResult(component.compileDefaultProps()),
        getResult("Component.defaultProps = {childProp:10}")
      );
      assert.equal(component.compileDefaultProps().indexOf(","), -1);
    }
  );

  mocha.it("ComponentInput gets all members from heritage clause", function () {
    generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("Widget"),
        generator.createNamedImports([
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("WidgetProps")
          ),
        ])
      ),
      generator.createStringLiteral(
        "./test-cases/declarations/src/component-input"
      )
    );

    const heritageClause = generator.createHeritageClause(
      generator.SyntaxKind.ExtendsKeyword,
      [
        generator.createExpressionWithTypeArguments(
          undefined,
          generator.createIdentifier("WidgetProps")
        ),
      ]
    );

    const model = new ComponentInput(
      [],
      [],
      generator.createIdentifier("Model"),
      [],
      [heritageClause],
      [],
      {}
    );

    assert.strictEqual(
      getResult(model.toString()),
      getResult(`
            export declare type ModelType = typeof WidgetProps & {};
            const Model:ModelType = WidgetProps
        `)
    );
  });

  mocha.it("ComponentInput inherit members - can redefine member", function () {
    generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("Widget"),
        generator.createNamedImports([
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("WidgetProps")
          ),
        ])
      ),
      generator.createStringLiteral(
        "./test-cases/declarations/src/component-input"
      )
    );

    const heritageClause = generator.createHeritageClause(
      generator.SyntaxKind.ExtendsKeyword,
      [
        generator.createExpressionWithTypeArguments(
          undefined,
          generator.createIdentifier("WidgetProps")
        ),
      ]
    );

    const model = new ComponentInput(
      [],
      [],
      generator.createIdentifier("Model"),
      [],
      [heritageClause],
      [
        generator.createProperty(
          [createDecorator(Decorators.OneWay)],
          [],
          generator.createIdentifier("height"),
          generator.SyntaxKind.ExclamationToken,
          generator.createKeywordTypeNode("string"),
          generator.createStringLiteral("10px")
        ),
      ],
      {}
    );

    assert.deepEqual(
      model.members.map((m) => {
        return m.typeDeclaration();
      }),
      ["height:string", "width?:number", "children?:React.ReactNode"]
    );

    assert.strictEqual(model.defaultPropsDest(), "Model");
    assert.strictEqual(
      removeSpaces(model.toString()),
      removeSpaces(`
            export declare type ModelType = typeof WidgetProps & {height:string}
            constModel:ModelType=Object.create(Object.prototype,Object.assign(Object.getOwnPropertyDescriptors(WidgetProps),Object.getOwnPropertyDescriptors({height:"10px"})));
        `)
    );
  });

  mocha.it(
    "ComponentInput - doesn't have properties without initializer",
    function () {
      const model = new ComponentInput(
        [],
        [],
        generator.createIdentifier("Model"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.OneWay)],
            [],
            generator.createIdentifier("height"),
            generator.SyntaxKind.ExclamationToken,
            generator.createKeywordTypeNode("string"),
            undefined
          ),
        ],
        {}
      );
      assert.strictEqual(
        getResult(model.toString()),
        getResult(`
            export declare type ModelType = {height:string}
            const Model:ModelType={} as any as ModelType
        `)
      );
    }
  );

  mocha.it(
    "ComponentInput should generate default and change for state property",
    function () {
      const model = new ComponentInput(
        [],
        [],
        generator.createIdentifier("Model"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.TwoWay)],
            [],
            generator.createIdentifier("p"),
            generator.SyntaxKind.ExclamationToken,
            generator.createKeywordTypeNode("string"),
            undefined
          ),
        ],
        {}
      );

      const members = model.members as Property[];

      assert.strictEqual(members.length, 3);
      assert.strictEqual(members[1].defaultDeclaration(), "defaultP:undefined");
      assert.strictEqual(members[1].typeDeclaration(), "defaultP?:string");

      assert.strictEqual(members[2].defaultDeclaration(), "pChange:()=>{}");
      assert.strictEqual(
        members[2].typeDeclaration(),
        "pChange?:(p:string)=>void"
      );
    }
  );

  mocha.it(
    "ComponentInput should not generate change for state property if it has one",
    function () {
      const model = new ComponentInput(
        [],
        [],
        generator.createIdentifier("Model"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.TwoWay)],
            [],
            generator.createIdentifier("p"),
            generator.SyntaxKind.ExclamationToken,
            generator.createKeywordTypeNode("string"),
            undefined
          ),
          generator.createProperty(
            [createDecorator("Event")],
            [],
            generator.createIdentifier("pChange"),
            generator.SyntaxKind.ExclamationToken,
            generator.createKeywordTypeNode("any"),
            undefined
          ),
        ],
        {}
      );

      const members = model.members as Property[];

      assert.strictEqual(members.length, 3);
      assert.strictEqual(members[1].defaultDeclaration(), "pChange:undefined");
      assert.strictEqual(members[1].typeDeclaration(), "pChange:any");

      assert.strictEqual(members[2].defaultDeclaration(), "defaultP:undefined");
      assert.strictEqual(members[2].typeDeclaration(), "defaultP?:string");
    }
  );
});

mocha.describe("Widget in jsx element", function () {
  this.beforeEach(function () {
    generator.setContext({
      dirname: __dirname,
    });
  });

  this.afterEach(function () {
    generator.setContext(null);
  });

  mocha.it(
    "Do not rename attribute if it has same name with getter",
    function () {
      generator.createClassDeclaration(
        [createComponentDecorator({})],
        [],
        generator.createIdentifier("Widget"),
        [],
        [],
        [
          generator.createGetAccessor(
            [],
            [],
            generator.createIdentifier("p"),
            []
          ),

          generator.createProperty(
            [createDecorator(Decorators.OneWay)],
            [],
            generator.createIdentifier("p"),
            undefined,
            undefined,
            undefined
          ),
        ]
      );

      const element = generator.createJsxSelfClosingElement(
        generator.createIdentifier("Widget"),
        [],
        [
          generator.createJsxAttribute(
            generator.createIdentifier("p"),
            generator.createJsxExpression(
              undefined,
              generator.createIdentifier("value1")
            )
          ),
        ]
      );

      assert.strictEqual(
        getResult(
          element.toString({
            members: [],
          })
        ),
        getResult(`
            <Widget
                p={value1}
            />`)
      );
    }
  );
});

mocha.describe(
  "React: Expressions with props/state/internal state",
  function () {
    this.beforeEach(function () {
      this.prop = generator.createProperty(
        [createDecorator(Decorators.OneWay)],
        [],
        generator.createIdentifier("p1"),
        generator.SyntaxKind.QuestionToken,
        generator.createKeywordTypeNode("string")
      );

      this.prop.scope = "props";

      this.state = generator.createProperty(
        [createDecorator(Decorators.TwoWay)],
        [],
        generator.createIdentifier("s1"),
        generator.SyntaxKind.QuestionToken,
        generator.createKeywordTypeNode("string")
      );

      this.state.scope = "props";

      this.internalState = generator.createProperty(
        [createDecorator("InternalState")],
        [],
        generator.createIdentifier("i1"),
        generator.SyntaxKind.QuestionToken,
        generator.createKeywordTypeNode("string")
      );

      this.propAccess = generator.createPropertyAccess(
        generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("props")
        ),
        generator.createIdentifier("p1")
      );

      this.stateAccess = generator.createPropertyAccess(
        generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("props")
        ),
        generator.createIdentifier("s1")
      );

      this.internalStateAccess = generator.createPropertyAccess(
        generator.createThis(),
        generator.createIdentifier("i1")
      );

      this.stateChange = generator.createProperty(
        [createDecorator(Decorators.Event)],
        [],
        generator.createIdentifier(`${this.state.name}Change`),
        generator.SyntaxKind.QuestionToken,
        undefined,
        generator.createArrowFunction(
          [],
          [],
          [],
          undefined,
          generator.SyntaxKind.EqualsGreaterThanToken,
          generator.createBlock([], false)
        )
      );
    });

    mocha.it("PropertyAccess. Prop", function () {
      assert.equal(
        this.propAccess.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "props.p1"
      );
      assert.deepEqual(
        this.propAccess.getDependency({
          members: [],
        }),
        ["p1"]
      );
    });

    mocha.it("Property access. this.props.p1", function () {
      const expression = generator.createPropertyAccess(
        generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("props")
        ),
        generator.createIdentifier("p1")
      );

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
          componentContext: "this",
          newComponentContext: "",
        }),
        "props.p1"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["p1"]
      );
    });

    mocha.it("Not member Property access.", function () {
      const expression = generator.createPropertyAccess(
        generator.createIdentifier("items"),
        generator.createIdentifier("item")
      );

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
          componentContext: "",
          newComponentContext: "",
        }),
        "items.item"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        []
      );
    });

    mocha.it("Property access. this.props", function () {
      const expression = generator.createPropertyAccess(
        generator.createThis(),
        generator.createIdentifier("props")
      );

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
          componentContext: "this",
          newComponentContext: "",
        }),
        "{...props,\ns1:(props.s1!==undefined?props.s1:__state_s1)}"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["props"]
      );
    });

    mocha.it("PropertyAccess. State", function () {
      assert.equal(
        this.stateAccess.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "(props.s1!==undefined?props.s1:__state_s1)"
      );
      assert.deepEqual(
        this.stateAccess.getDependency({
          members: [],
        }),
        ["s1"]
      );
    });

    mocha.it("PropertyAccess. State in props", function () {
      const expression = generator.createPropertyAccess(
        generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("props")
        ),
        generator.createIdentifier("s1")
      );

      this.state.inherited = true;

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "(props.s1!==undefined?props.s1:__state_s1)"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["s1"]
      );
    });

    mocha.it("PropertyAccess. Internal State", function () {
      assert.equal(
        this.internalStateAccess.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        ["__state_i1"]
      );
      assert.deepEqual(
        this.internalStateAccess.getDependency({
          members: [],
        }),
        ["i1"]
      );
    });

    mocha.it("PropertyAccess. Dependencies on assignment", function () {
      const expression = generator.createPropertyAccess(
        generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("props")
        ),
        generator.createIdentifier("s1")
      );

      this.state.inherited = true;

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "(props.s1!==undefined?props.s1:__state_s1)"
      );
      assert.deepEqual(expression.getAssignmentDependency(), ["s1Change"]);
    });

    mocha.it(
      "= operator for state - set state and raise change state",
      function () {
        const expression = generator.createBinary(
          this.stateAccess,
          generator.SyntaxKind.EqualsToken,
          generator.createIdentifier("a")
        );

        assert.equal(
          expression.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          }),
          "(__state_setS1(__state_s1 => a), props.s1Change!(a))"
        );
        assert.deepEqual(
          expression.getDependency({
            members: [],
          }),
          ["s1Change"]
        );
        assert.deepEqual(
          expression.getAllDependency({
            members: [],
          }),
          ["s1"]
        );
      }
    );

    mocha.it(
      "= operator for state - add .? token if change property has not initializer",
      function () {
        const expression = generator.createBinary(
          this.stateAccess,
          generator.SyntaxKind.EqualsToken,
          generator.createIdentifier("a")
        );

        this.stateChange.initializer = undefined;

        assert.equal(
          expression.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          }),
          "(__state_setS1(__state_s1 => a), props.s1Change?.(a))"
        );
      }
    );

    mocha.it(
      "= operator for state - do not add token if change property has exclamation token",
      function () {
        const expression = generator.createBinary(
          this.stateAccess,
          generator.SyntaxKind.EqualsToken,
          generator.createIdentifier("a")
        );

        this.stateChange.initializer = undefined;
        this.stateChange.questionOrExclamationToken =
          generator.SyntaxKind.ExclamationToken;

        assert.equal(
          expression.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          }),
          "(__state_setS1(__state_s1 => a), props.s1Change(a))"
        );
      }
    );

    mocha.it(
      "= operator for internal state - call __state_set...",
      function () {
        const expression = generator.createBinary(
          this.internalStateAccess,
          generator.SyntaxKind.EqualsToken,
          generator.createIdentifier("a")
        );

        assert.equal(
          getResult(
            expression.toString({
              members: [this.state, this.prop, this.internalState],
            })
          ),
          getResult("__state_setI1(__state_i1 => a);")
        );
      }
    );

    mocha.it("set object literal in state", function () {
      const expression = generator.createBinary(
        this.internalStateAccess,
        generator.SyntaxKind.EqualsToken,
        generator.createObjectLiteral([], false)
      );

      assert.equal(
        getResult(
          expression.toString({
            members: [this.state, this.prop, this.internalState],
          })
        ),
        getResult("__state_setI1(__state_i1 => ({}));")
      );
    });

    mocha.it("= operator for prop - throw error", function () {
      const expression = generator.createBinary(
        this.propAccess,
        generator.SyntaxKind.EqualsToken,
        generator.createIdentifier("a")
      );

      let error = null;
      try {
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        });
      } catch (e) {
        error = e;
      }

      assert.strictEqual(
        error,
        "Error: Can't assign property use TwoWay, Internal State, Ref, ForwardRef prop - this.props.p1 = a"
      );
    });

    mocha.it("Binary operator returns dependency for both side", function () {
      const expression = generator.createBinary(
        this.stateAccess,
        generator.SyntaxKind.EqualsEqualsEqualsToken,
        this.propAccess
      );

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "(props.s1!==undefined?props.s1:__state_s1) === props.p1"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["s1", "p1"]
      );
      assert.deepEqual(
        expression.getAllDependency({
          members: [],
        }),
        ["s1", "p1"]
      );
    });

    mocha.it("Set ref.InnerHtml", function () {
      const prop = generator.createProperty(
        [createDecorator("Ref")],
        undefined,
        generator.createIdentifier("div")
      );
      const expression = generator.createBinary(
        generator.createPropertyAccess(
          generator.createPropertyAccess(
            generator.createPropertyAccess(
              generator.createThis(),
              generator.createIdentifier("div")
            ),
            generator.createIdentifier("current")
          ),
          generator.createIdentifier("InnerHtml")
        ),
        generator.SyntaxKind.EqualsToken,
        generator.createIdentifier("value")
      );

      assert.equal(
        expression.toString({
          members: [prop],
          componentContext: "this",
          newComponentContext: "",
        }),
        "div.current.InnerHtml = value"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        []
      );
    });

    mocha.it("Set ref.InnerHtml unary", function () {
      const prop = generator.createProperty(
        [createDecorator("Ref")],
        undefined,
        generator.createIdentifier("div")
      );
      const expression = generator.createPostfix(
        generator.createPropertyAccess(
          generator.createPropertyAccess(
            generator.createPropertyAccess(
              generator.createThis(),
              generator.createIdentifier("div")
            ),
            generator.createIdentifier("current")
          ),
          generator.createIdentifier("InnerHtml")
        ),
        generator.SyntaxKind.PlusPlusToken
      );

      assert.equal(
        expression.toString({
          members: [prop],
          componentContext: "this",
          newComponentContext: "",
        }),
        "div.current.InnerHtml++"
      );
    });

    mocha.it("Set ref.InnerHtml short operator", function () {
      const prop = generator.createProperty(
        [createDecorator("Ref")],
        undefined,
        generator.createIdentifier("div")
      );

      const expression = generator.createBinary(
        generator.createPropertyAccess(
          generator.createPropertyAccess(
            generator.createPropertyAccess(
              generator.createThis(),
              generator.createIdentifier("div")
            ),
            generator.createIdentifier("current")
          ),
          generator.createIdentifier("InnerHtml")
        ),
        generator.SyntaxKind.PlusEqualsToken,
        generator.createIdentifier("value")
      );

      assert.equal(
        expression.toString({
          members: [prop],
          componentContext: "this",
          newComponentContext: "",
        }),
        "div.current.InnerHtml += value"
      );
    });

    mocha.it(
      "VariableDeclarationList return dependency for initializer",
      function () {
        const expression = generator.createVariableStatement(
          undefined,
          generator.createVariableDeclarationList(
            [
              generator.createVariableDeclaration(
                generator.createIdentifier("v"),
                undefined,
                generator.createBinary(
                  this.propAccess,
                  generator.createToken(
                    generator.SyntaxKind.AmpersandAmpersandToken
                  ),
                  this.stateAccess
                )
              ),
            ],
            generator.NodeFlags.Const
          )
        );

        assert.deepEqual(
          expression.getDependency({
            members: [],
          }),
          ["p1", "s1"]
        );
      }
    );

    mocha.it(
      "VariableDeclaration returns dependency for Binding Pattern",
      function () {
        const expression = generator.createVariableDeclaration(
          generator.createObjectBindingPattern([
            generator.createBindingElement(
              undefined,
              undefined,
              generator.createIdentifier("height"),
              undefined
            ),
          ]),
          undefined,
          generator.createPropertyAccess(
            generator.createThis(),
            generator.createIdentifier("props")
          )
        );

        assert.deepEqual(
          expression.getDependency({
            members: [],
          }),
          ["height"]
        );
      }
    );

    mocha.it(
      "VariableDeclaration returns all props dependency if binding element have rest operator",
      function () {
        const expression = generator.createVariableDeclaration(
          generator.createObjectBindingPattern([
            generator.createBindingElement(
              generator.SyntaxKind.DotDotDotToken,
              undefined,
              generator.createIdentifier("rest"),
              undefined
            ),
          ]),
          undefined,
          generator.createPropertyAccess(
            generator.createThis(),
            generator.createIdentifier("props")
          )
        );

        assert.deepEqual(
          expression.getDependency({
            members: [],
          }),
          ["props"]
        );
      }
    );

    mocha.it("Arrow Function. Can set state", function () {
      const arrowFunction = generator.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        generator.createToken(generator.SyntaxKind.EqualsGreaterThanToken),
        generator.createBinary(
          this.stateAccess,
          generator.createToken(generator.SyntaxKind.EqualsToken),
          generator.createNumericLiteral("10")
        )
      );

      assert.deepEqual(
        arrowFunction.getDependency({
          members: [],
        }),
        ["s1Change"]
      );
      assert.equal(
        getResult(
          arrowFunction.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          })
        ),
        getResult("()=>(__state_setS1(__state_s1 => 10), props.s1Change!(10))")
      );
    });

    mocha.it("Arrow Function. Can set internal state", function () {
      const arrowFunction = generator.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        generator.createToken(generator.SyntaxKind.EqualsGreaterThanToken),
        generator.createBinary(
          this.internalStateAccess,
          generator.createToken(generator.SyntaxKind.EqualsToken),
          generator.createNumericLiteral("10")
        )
      );

      assert.deepEqual(
        arrowFunction.getDependency({
          members: [],
        }),
        []
      );
      assert.equal(
        getResult(
          arrowFunction.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          })
        ),
        getResult("()=>__state_setI1(__state_i1 => 10)")
      );
    });

    mocha.it("Arrow Function. Can set prop in state", function () {
      const arrowFunction = generator.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        generator.createToken(generator.SyntaxKind.EqualsGreaterThanToken),
        generator.createBinary(
          this.stateAccess,
          generator.createToken(generator.SyntaxKind.EqualsToken),
          this.propAccess
        )
      );

      assert.deepEqual(
        arrowFunction.getDependency({
          members: [],
        }),
        ["s1Change", "p1"]
      );
      assert.equal(
        getResult(
          arrowFunction.toString({
            members: [
              this.state,
              this.prop,
              this.internalState,
              this.stateChange,
            ],
          })
        ),
        getResult(
          "()=>(__state_setS1((__state_s1) => props.p1), props.s1Change!(props.p1))"
        )
      );
    });

    mocha.it(
      "PropertyAccess should replace componentContext on newComponentContext",
      function () {
        const expression = generator.createPropertyAccess(
          generator.createThis(),
          generator.createIdentifier("name")
        );

        assert.equal(
          expression.toString({
            members: [this.state, this.prop, this.internalState],
            componentContext: "this",
            newComponentContext: "",
          }),
          "name"
        );
        assert.equal(expression.toString(), "this.name");
      }
    );

    mocha.it("createPropertyAccessChain", function () {
      const expression = generator.createPropertyAccessChain(
        this.propAccess,
        generator.createToken(generator.SyntaxKind.QuestionDotToken),
        generator.createCall(
          generator.createIdentifier("call"),
          [],
          [this.stateAccess]
        )
      );

      assert.equal(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "props.p1?.call((props.s1!==undefined?props.s1:__state_s1))"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["p1", "s1"]
      );
    });

    mocha.it(
      "createCallChain with props, state internal state in args",
      function () {
        const expression = generator.createCallChain(
          generator.createPropertyAccessChain(
            generator.createIdentifier("model"),
            generator.createToken(generator.SyntaxKind.QuestionDotToken),
            generator.createIdentifier("onClick")
          ),
          undefined,
          undefined,
          [this.propAccess, this.stateAccess, this.internalStateAccess]
        );

        assert.deepEqual(
          expression.toString({
            members: [this.state, this.prop, this.internalState],
          }),
          "model?.onClick(props.p1,(props.s1!==undefined?props.s1:__state_s1),__state_i1)"
        );
        assert.deepEqual(
          expression.getDependency({
            members: [],
          }),
          ["p1", "s1", "i1"]
        );
      }
    );

    mocha.it("createCallChain with props, in expression", function () {
      const expression = generator.createCallChain(
        generator.createPropertyAccessChain(
          this.propAccess,
          generator.createToken(generator.SyntaxKind.QuestionDotToken),
          generator.createIdentifier("onClick")
        ),
        undefined,
        undefined,
        []
      );

      assert.deepEqual(
        expression.toString({
          members: [this.state, this.prop, this.internalState],
        }),
        "props.p1?.onClick()"
      );
      assert.deepEqual(
        expression.getDependency({
          members: [],
        }),
        ["p1"]
      );
    });

    mocha.it("Method should return dependency for all properties", function () {
      const method = generator.createMethod(
        [],
        [],
        "",
        generator.createIdentifier("p"),
        "",
        undefined,
        [],
        undefined,
        generator.createBlock(
          [this.propAccess, this.internalStateAccess, this.stateAccess],
          false
        )
      );

      assert.deepEqual(
        method.getDependency({
          members: [this.internalState, this.state, this.prop],
          componentContext: generator.SyntaxKind.ThisKeyword,
        }),
        ["props.p1", "__state_i1", "props.s1", "__state_s1"]
      );
    });

    mocha.it(
      "Method should not return dependency for unknown property",
      function () {
        const method = generator.createMethod(
          [],
          [],
          "",
          generator.createIdentifier("p"),
          "",
          undefined,
          [],
          undefined,
          generator.createBlock(
            [this.propAccess, this.internalStateAccess],
            false
          )
        );

        assert.deepEqual(
          method.getDependency({
            members: [this.state, this.prop],
            componentContext: generator.SyntaxKind.ThisKeyword,
          }),
          ["props.p1"]
        );
      }
    );

    mocha.it(
      "Method should not include single props if there is props in dependency",
      function () {
        const method = generator.createMethod(
          [],
          [],
          "",
          generator.createIdentifier("p"),
          "",
          undefined,
          [],
          undefined,
          generator.createBlock(
            [
              this.propAccess,
              this.stateAccess,
              generator.createPropertyAccess(
                generator.createThis(),
                generator.createIdentifier("props")
              ),
            ],
            false
          )
        );

        assert.deepEqual(
          method.getDependency({
            members: [this.internalState, this.state, this.prop],
            componentContext: generator.SyntaxKind.ThisKeyword,
          }),
          ["__state_s1", "props"]
        );
      }
    );
  }
);

mocha.describe("ComponentInput", function () {
  this.beforeEach(function () {
    generator.setContext({});
    this.decorators = [
      generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("ComponentBindings"),
          [],
          []
        )
      ),
    ];
  });

  this.afterEach(function () {
    generator.setContext(null);
  });

  mocha.it("Create Component Input", function () {
    const expression = generator.createClassDeclaration(
      this.decorators,
      ["export"],
      generator.createIdentifier("BaseModel"),
      [],
      [],
      []
    );

    assert.strictEqual(
      getResult(expression.toString()),
      getResult(`
            export declare type BaseModelType = {};
            export const BaseModel:BaseModelType = {};
        `)
    );

    const cachedComponent = generator.getContext().components!["BaseModel"];
    assert.equal(cachedComponent, expression);
    assert.deepEqual(
      cachedComponent.heritageProperties.map((p) => p.toString),
      []
    );
  });

  mocha.it("Component input has heritage properties", function () {
    const expression = generator.createClassDeclaration(
      this.decorators,
      ["export"],
      generator.createIdentifier("BaseModel"),
      [],
      [],
      [
        new Property(
          [createDecorator(Decorators.OneWay)],
          [],
          generator.createIdentifier("p"),
          undefined,
          generator.createKeywordTypeNode("number"),
          generator.createNumericLiteral("10")
        ),
        new Property(
          [createDecorator(Decorators.OneWay)],
          [],
          generator.createIdentifier("p1"),
          undefined,
          generator.createKeywordTypeNode("number"),
          generator.createNumericLiteral("15")
        ),
      ]
    );

    assert.strictEqual(
      getResult(expression.toString()),
      getResult(`
            export declare type BaseModelType = {p:number; p1:number};
            export const BaseModel:BaseModelType={p:10, p1: 15};
        `)
    );
    const cachedComponent = generator.getContext().components!["BaseModel"];
    assert.deepEqual(
      cachedComponent.heritageProperties.map((p) => p.name),
      ["p", "p1"]
    );
  });

  mocha.it(
    "Add Render+Component for Template property: template->render+component",
    function () {
      const expression = generator.createClassDeclaration(
        this.decorators,
        ["export"],
        generator.createIdentifier("BaseModel"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("template"),
            undefined,
            generator.createFunctionTypeNode(
              undefined,
              [
                generator.createParameter(
                  [],
                  [],
                  undefined,
                  generator.createIdentifier("a"),
                  generator.SyntaxKind.QuestionToken,
                  generator.createKeywordTypeNode("string"),
                  undefined
                ),
                generator.createParameter(
                  [],
                  [],
                  undefined,
                  generator.createIdentifier("b"),
                  undefined,
                  generator.createKeywordTypeNode("number"),
                  undefined
                ),
              ],
              generator.createKeywordTypeNode("any")
            ),
            undefined
          ),
        ]
      );

      assert.strictEqual(
        getResult(expression.toString()),
        getResult(`
            export declare type BaseModelType={
              template: (a?: string, b: number) => any;
              render?: (a?:string,b:number)=>any;
              component?: (a?:string,b:number)=>any
            };
            export const BaseModel:BaseModelType={};
        `)
      );
    }
  );

  mocha.it(
    "Should replace template property with JSXTemplate type",
    function () {
      const expression = generator.createClassDeclaration(
        this.decorators,
        ["export"],
        generator.createIdentifier("BaseModel"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("template"),
            undefined,
            generator.createTypeReferenceNode(
              generator.createIdentifier("JSXTemplate"),
              [
                generator.createTypeReferenceNode(
                  generator.createIdentifier("widgetProps"),
                  []
                ),
                generator.createLiteralTypeNode(
                  generator.createStringLiteral("requiredProperty")
                ),
              ]
            ),
            undefined
          ),
        ]
      );

      assert.strictEqual(
        getResult(expression.toString()),
        getResult(`
          export declare type BaseModelType = {
            template:React.FunctionComponent<Partial<Omit<widgetProps,"requiredProperty">> & Required<Pick<widgetProps,"requiredProperty">>>;
            render?:React.FunctionComponent<Partial<Omit<widgetProps,"requiredProperty">> & Required<Pick<widgetProps,"requiredProperty">>>;
            component?:React.JSXElementConstructor<Partial<Omit<widgetProps,"requiredProperty">> & Required<Pick<widgetProps,"requiredProperty">>>
          }
          export const BaseModel:BaseModelType={ };
        `)
      );
    }
  );

  mocha.it(
    "Add Render+Component for Template property: contentTemplate->contentRender+contentComponent",
    function () {
      const expression = generator.createClassDeclaration(
        this.decorators,
        ["export"],
        generator.createIdentifier("BaseModel"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.Template)],
            [],
            generator.createIdentifier("contentTemplate"),
            undefined,
            generator.createKeywordTypeNode("any")
          ),
        ]
      );

      assert.strictEqual(
        getResult(expression.toString()),
        getResult(`
            export declare type BaseModelType = {contentTemplate: any,contentRender?: any,contentComponent?: any};
            export const BaseModel:BaseModelType={} as any as BaseModelType;
        `)
      );
    }
  );

  mocha.describe("Required prop", function () {
    mocha.it("Type declaration should have exclamation token", function () {
      const expression = generator.createClassDeclaration(
        this.decorators,
        ["export"],
        generator.createIdentifier("BaseModel"),
        [],
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.OneWay)],
            undefined,
            generator.createIdentifier("prop"),
            generator.SyntaxKind.ExclamationToken,
            generator.createKeywordTypeNode("number"),
            generator.createNumericLiteral("1")
          ),
        ]
      );

      assert.strictEqual(
        getResult(expression.toString()),
        getResult(`
                export declare type BaseModelType = {
                    prop: number
                };
                export const BaseModel:BaseModelType = {
                    prop: 1
                };
            `)
      );
    });
  });

  mocha.describe("CompileViewModelArguments", function () {
    this.beforeEach(function () {});

    mocha.it("Empty input with empty component", function () {
      const component = createComponent([]);
      assert.strictEqual(
        getResult(component.compileViewModelArguments()),
        getResult(`{
          props:{...props},
          restAttributes: __restAttributes()
        }`)
      );
    });

    mocha.it("Prop in input with empty component", function () {
      const component = createComponent([
        generator.createProperty(
          [
            generator.createDecorator(
              generator.createCall(
                generator.createIdentifier(Decorators.OneWay),
                [],
                []
              )
            ),
          ],
          [],
          generator.createIdentifier("p"),
          "",
          generator.createKeywordTypeNode(generator.SyntaxKind.BooleanKeyword)
        ),
      ]);
      assert.strictEqual(
        getResult(component.compileViewModelArguments()),
        getResult(`{
          props:{...props},
          restAttributes:__restAttributes()
        }`)
      );
    });

    mocha.it(
      "State in input - extended props with state getter in viewModes args",
      function () {
        const component = createComponent([
          generator.createProperty(
            [
              generator.createDecorator(
                generator.createCall(
                  generator.createIdentifier(Decorators.TwoWay),
                  [],
                  []
                )
              ),
            ],
            [],
            generator.createIdentifier("p"),
            "",
            generator.createKeywordTypeNode(
              generator.SyntaxKind.BooleanKeyword
            ),
            undefined
          ),
        ]);
        assert.deepEqual(
          getResult(`${component.compileViewModelArguments()}`),
          getResult(`{
                props:{
                    ...props,
                    p:(props.p!==undefined?props.p:__state_p)
                },
                restAttributes: __restAttributes()
            }`)
        );
      }
    );

    mocha.it(
      "component with internal state - add internal state to viewModel args",
      function () {
        const component = createComponent(
          [
            generator.createProperty(
              [
                generator.createDecorator(
                  generator.createCall(
                    generator.createIdentifier(Decorators.OneWay),
                    [],
                    []
                  )
                ),
              ],
              [],
              generator.createIdentifier("p"),
              "",
              generator.createKeywordTypeNode(
                generator.SyntaxKind.BooleanKeyword
              ),
              undefined
            ),
          ],
          [
            generator.createProperty(
              [
                generator.createDecorator(
                  generator.createCall(
                    generator.createIdentifier("InternalState"),
                    [],
                    []
                  )
                ),
              ],
              [],
              generator.createIdentifier("s"),
              "",
              generator.createKeywordTypeNode(
                generator.SyntaxKind.BooleanKeyword
              )
            ),
          ]
        );
        assert.deepEqual(
          getResult(`${component.compileViewModelArguments()}`),
          getResult(
            "{props:{...props},s:__state_s,restAttributes: __restAttributes()}"
          )
        );
      }
    );

    mocha.it("Pass getter result in viewModel arguments", function () {
      const component = createComponent(
        [],
        [
          generator.createGetAccessor(
            [],
            [],
            generator.createIdentifier("property"),
            [],
            undefined,
            undefined
          ),
        ]
      );

      assert.strictEqual(
        getResult(component.compileComponentInterface()),
        getResult(
          "interface Widget{props: typeof Input & RestProps; property:any; restAttributes:RestProps;}"
        )
      );

      assert.strictEqual(
        getResult(`${component.compileViewModelArguments()}`),
        getResult(
          "{props:{...props}, property: __property(), restAttributes: __restAttributes() }"
        )
      );
    });

    mocha.it("Exclude private members", function () {
      const component = createComponent(
        [],
        [
          generator.createProperty(
            [createDecorator(Decorators.InternalState)],
            [generator.SyntaxKind.PrivateKeyword],
            generator.createIdentifier("s")
          ),
          generator.createGetAccessor(
            [],
            [generator.SyntaxKind.PrivateKeyword],
            generator.createIdentifier("property"),
            [],
            undefined,
            undefined
          ),

          generator.createMethod(
            [],
            [generator.SyntaxKind.PrivateKeyword],
            undefined,
            generator.createIdentifier("method"),
            undefined,
            undefined,
            [],
            undefined,
            generator.createBlock([], false)
          ),
        ]
      );

      assert.strictEqual(
        getResult(component.compileComponentInterface()),
        getResult(
          "interface Widget{props: typeof Input & RestProps; restAttributes:RestProps;}"
        )
      );

      assert.strictEqual(
        getResult(`${component.compileViewModelArguments()}`),
        getResult("{props:{...props}, restAttributes: __restAttributes() }")
      );
    });
  });

  mocha.describe("Property. getters, getDependency", function () {
    mocha.it(
      "Property without decorators should be an internal state",
      function () {
        const property = generator.createProperty(
          [],
          undefined,
          generator.createIdentifier("p"),
          generator.SyntaxKind.QuestionToken
        );

        assert.strictEqual(property.getter(), "__state_p");
        assert.deepEqual(
          property.getDependency({
            members: [],
          }),
          ["__state_p"]
        );
      }
    );

    mocha.it("Property with unknown decorator should throw error", function () {
      const property = generator.createProperty(
        [createDecorator("any")],
        undefined,
        generator.createIdentifier("p"),
        generator.SyntaxKind.QuestionToken
      );

      try {
        property.getter();
      } catch (e) {
        assert.strictEqual(e, "Can't parse property: p");
      }
    });

    mocha.it("Property with unknown decorator should throw error", function () {
      const property = generator.createProperty(
        [createDecorator("any")],
        undefined,
        generator.createIdentifier("p"),
        generator.SyntaxKind.QuestionToken
      );

      try {
        property.getDependency({
          members: [],
        });
      } catch (e) {
        assert.strictEqual(e, "Can't parse property: p");
      }
    });

    mocha.it(
      "Should throw an error if *Render prop defined along with *Template",
      function () {
        try {
          generator.createClassDeclaration(
            this.decorators,
            ["export"],
            generator.createIdentifier("BaseModel"),
            [],
            [],
            [
              generator.createProperty(
                [createDecorator(Decorators.Template)],
                [],
                generator.createIdentifier("contentTemplate"),
                undefined,
                generator.createKeywordTypeNode("any")
              ),
              generator.createProperty(
                [createDecorator(Decorators.OneWay)],
                [],
                generator.createIdentifier("contentRender"),
                undefined,
                generator.createKeywordTypeNode("any")
              ),
            ]
          );
        } catch (e) {
          assert.strictEqual(
            e,
            "You can't use 'contentRender' property. It'll be generated for 'contentTemplate' template property."
          );
        }
      }
    );

    mocha.it(
      "Should throw an error if *Component prop defined along with *Template",
      function () {
        try {
          generator.createClassDeclaration(
            this.decorators,
            ["export"],
            generator.createIdentifier("BaseModel"),
            [],
            [],
            [
              generator.createProperty(
                [createDecorator(Decorators.Template)],
                [],
                generator.createIdentifier("contentTemplate"),
                undefined,
                generator.createKeywordTypeNode("any")
              ),
              generator.createProperty(
                [createDecorator(Decorators.Template)],
                [],
                generator.createIdentifier("contentComponent"),
                undefined,
                generator.createKeywordTypeNode("any")
              ),
            ]
          );
        } catch (e) {
          assert.strictEqual(
            e,
            "You can't use 'contentComponent' property. It'll be generated for 'contentTemplate' template property."
          );
        }
      }
    );
  });
});

mocha.describe("Default_options", function () {
  function setupGenerator(context: GeneratorContext) {
    generator.setContext(context);
  }
  this.beforeEach(function () {
    setupGenerator({
      dirname: path.join(__dirname, "test-cases"),
      defaultOptionsModule: `${__dirname}/default_options`,
    });
  });

  this.afterEach(function () {
    generator.options = {};
    generator.setContext(null);
  });

  mocha.describe(
    "Store default_options import statement in context",
    function () {
      mocha.it("default_options in parent folder", function () {
        const expected = 'import defaultOptions from "../default_options"';
        assert.strictEqual(
          generator
            .createImportDeclaration(
              undefined,
              undefined,
              generator.createImportClause(
                generator.createIdentifier("defaultOptions"),
                undefined
              ),
              generator.createStringLiteral("../default_options")
            )
            .toString(),
          expected
        );

        assert.strictEqual(
          generator.getContext().defaultOptionsImport!.toString(),
          expected
        );
      });

      mocha.it("default_options in same folder", function () {
        setupGenerator({
          dirname: __dirname,
          defaultOptionsModule: `${__dirname}/default_options`,
        });

        generator.createImportDeclaration(
          undefined,
          undefined,
          generator.createImportClause(
            generator.createIdentifier("defaultOptions"),
            undefined
          ),
          generator.createStringLiteral("./default_options")
        );

        assert.strictEqual(
          generator.getContext().defaultOptionsImport!.toString(),
          'import defaultOptions from "./default_options"'
        );
      });

      mocha.it("default_options in child folder", function () {
        setupGenerator({
          dirname: __dirname,
          defaultOptionsModule: `${__dirname}/child/default_options`,
        });

        generator.createImportDeclaration(
          undefined,
          undefined,
          generator.createImportClause(
            generator.createIdentifier("defaultOptions"),
            undefined
          ),
          generator.createStringLiteral("./child/default_options")
        );

        assert.strictEqual(
          generator.getContext().defaultOptionsImport!.toString(),
          'import defaultOptions from "./child/default_options"'
        );
      });
    }
  );

  mocha.it("Add import convertRulesToOptions, Rule", function () {
    const importClause = generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("defaultOptions"),
        undefined
      ),
      generator.createStringLiteral("../default_options")
    );

    const component = new ReactComponent(
      generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      ),
      [],
      generator.createIdentifier("Component"),
      [],
      [],
      [],
      generator.getContext()
    );

    assert.strictEqual(
      getResult(importClause.toString()),
      getResult(
        `import defaultOptions, {convertRulesToOptions, Rule} from "../default_options"`
      )
    );
    assert.strictEqual(
      getResult(component.compileImports()),
      getResult(
        `import * as React from "react"; import { useCallback } from "react";`
      )
    );
  });

  mocha.it("Adding imports should not leads to duplicates", function () {
    const importClause = generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        generator.createIdentifier("defaultOptions"),
        generator.createNamedImports([
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("Rule")
          ),
        ])
      ),
      generator.createStringLiteral("../default_options")
    );

    new ReactComponent(
      generator.createDecorator(
        generator.createCall(
          generator.createIdentifier("Component"),
          [],
          [generator.createObjectLiteral([], false)]
        )
      ),
      [],
      generator.createIdentifier("Component"),
      [],
      [],
      [],
      generator.getContext()
    );

    assert.strictEqual(
      getResult(importClause.toString()),
      getResult(
        `import defaultOptions, {convertRulesToOptions, Rule} from "../default_options"`
      )
    );
  });

  mocha.it(
    "Import default_options if module doesn't import default_options",
    function () {
      const component = new ReactComponent(
        generator.createDecorator(
          generator.createCall(
            generator.createIdentifier("Component"),
            [],
            [generator.createObjectLiteral([], false)]
          )
        ),
        [],
        generator.createIdentifier("Component"),
        [],
        [],
        [],
        generator.getContext()
      );

      assert.strictEqual(
        getResult(component.compileImports()),
        getResult(
          `import {convertRulesToOptions, Rule} from "../default_options"; import * as React from "react"; import { useCallback } from "react";`
        )
      );
    }
  );

  mocha.it(
    "Do not import default_options if defaultOptionRules is set to null",
    function () {
      const component = new ReactComponent(
        createComponentDecorator({
          defaultOptionRules: generator.createNull(),
        }),
        [],
        generator.createIdentifier("Component"),
        [],
        [],
        [],
        generator.getContext()
      );

      assert.strictEqual(
        getResult(component.compileImports()),
        getResult(
          `import * as React from "react"; import { useCallback } from "react";`
        )
      );
    }
  );

  mocha.it(
    "Do not generate DefaultOptionsMethod if defaultOptionRules parameter is null",
    function () {
      const component = new ReactComponent(
        createComponentDecorator({
          defaultOptionRules: generator.createNull(),
        }),
        [],
        generator.createIdentifier("Component"),
        [],
        [],
        [],
        generator.getContext()
      );

      assert.strictEqual(component.compileDefaultOptionsMethod(), "");
    }
  );
});

mocha.describe("Import_Declaration", function(){
  this.beforeEach(function () {
    generator.setContext({ dirname: path.resolve(__dirname) });
  });

  this.afterEach(function () {
    generator.setContext(null);
  });
  mocha.it("generates import for RefObject", function(){
    const importDeclaration = generator.createImportDeclaration(
      undefined,
      undefined,
      generator.createImportClause(
        undefined,
        generator.createNamedImports([
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("ComponentBindings")
          ),
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("Ref")
          ),
          generator.createImportSpecifier(
            undefined,
            generator.createIdentifier("RefObject")
          )
        ]),
        false
      ),
      generator.createStringLiteral("@devextreme-generator/declarations")
    );
    assert.strictEqual(
      getResult(importDeclaration.toString()),
      getResult(
        `import { MutableRefObject } from "react"`
      )
    );
  })
})
