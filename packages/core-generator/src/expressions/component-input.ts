import { Decorators } from '../decorators';
import { SyntaxKind } from '../syntaxKind';
import { GeneratorContext, TypeExpressionImports } from '../types';
import { findComponentInput } from '../utils/expressions';
import { warn } from '../utils/messages';
import { capitalizeFirstLetter } from '../utils/string';
import { Expression, SimpleExpression } from './base';
import {
  Class, getMemberListFromTypeExpression, Heritable, HeritageClause, inheritMembers,
} from './class';
import { BaseClassMember, Method, Property } from './class-members';
import { Call, Identifier } from './common';
import { getProps } from './component';
import { Decorator } from './decorator';
import { Parameter } from './functions';
import { ObjectLiteral } from './literal';
import { PropertyAssignment } from './property-assignment';
import {
  extractComplexType,
  FunctionTypeNode,
  IntersectionTypeNode,
  mergeTypeExpressionImports,
  SimpleTypeExpression,
  TypeExpression,
  TypeReferenceNode,
} from './type';
import { PropertyAccessChain, PropertyAccess } from './property-access';

const RESERVED_NAMES = ['class', 'key', 'ref', 'style', 'class'];

export class ComponentInput extends Class implements Heritable {
  constructor(
    decorators: Decorator[],
    modifiers: string[] | undefined,
    name: Identifier,
    typeParameters: TypeExpression[] | string[] | undefined,
    heritageClauses: HeritageClause[] = [],
    members: Array<Property | Method>,
    context: GeneratorContext,
  ) {
    super(
      decorators,
      modifiers,
      name,
      typeParameters,
      heritageClauses.filter((h) => h.token === SyntaxKind.ExtendsKeyword),
      members,
      context,
    );
  }

  get baseTypes() {
    return this.heritageClauses.reduce(
      (t: string[], h) => t.concat(h.typeNodes.map((t) => t.toString())),
      [],
    );
  }

  createProperty(
    decorators: Decorator[],
    modifiers: string[] | undefined,
    name: Identifier,
    questionOrExclamationToken?: string,
    type?: string | TypeExpression,
    initializer?: Expression,
  ) {
    return new Property(
      decorators,
      modifiers,
      name,
      questionOrExclamationToken,
      type,
      initializer,
    );
  }

  createDecorator(expression: Call, context: GeneratorContext) {
    return new Decorator(expression, context);
  }

  buildChangeStateType(stateMember: Property) {
    return new FunctionTypeNode(
      undefined,
      [
        new Parameter(
          [],
          [],
          undefined,
          stateMember._name,
          stateMember.questionOrExclamationToken === SyntaxKind.QuestionToken
            ? stateMember.questionOrExclamationToken
            : '',
          stateMember.type,
        ),
      ],
      new SimpleTypeExpression('void'),
    );
  }

  buildChangeState(stateMember: Property, stateName: Identifier) {
    return this.createProperty(
      [
        this.createDecorator(
          new Call(new Identifier('Event'), undefined, []),
          {},
        ),
      ],
      [],
      stateName,
      SyntaxKind.QuestionToken,
      this.buildChangeStateType(stateMember),
      new SimpleExpression('()=>{}'),
    );
  }

  buildDefaultStateProperty(stateMember: Property): Property | null {
    return this.createProperty(
      [
        this.createDecorator(
          new Call(new Identifier('OneWay'), undefined, []),
          {},
        ),
      ],
      [],
      new Identifier(`default${capitalizeFirstLetter(stateMember._name)}`),
      stateMember.initializer ? '' : SyntaxKind.QuestionToken,
      stateMember.type,
      stateMember.initializer,
    );
  }

  buildStateProperties(stateMember: Property, members: BaseClassMember[]) {
    const props: Property[] = [];
    const defaultStatePropName = `default${capitalizeFirstLetter(
      stateMember._name,
    )}`;
    if (!members.some((m) => m._name.toString() === defaultStatePropName)) {
      const defaultStateProperty = this.buildDefaultStateProperty(stateMember);

      if (defaultStateProperty) {
        props.push(defaultStateProperty);
      }
    }

    const stateName = `${stateMember._name}Change`;

    if (!members.some((m) => m._name.toString() === stateName)) {
      props.push(this.buildChangeState(stateMember, new Identifier(stateName)));
    }

    return props;
  }

  buildTemplateProperties(
    _templateMember: Property,
    _members: BaseClassMember[],
  ): Property[] {
    return [];
  }

  processMembers(members: Array<Property | Method>) {
    members.forEach((m) => {
      const refIndex = m.decorators.findIndex((d) => d.name === Decorators.Ref);
      if (refIndex > -1) {
        m.decorators[refIndex] = this.createDecorator(
          new Call(new Identifier(Decorators.RefProp), undefined, []),
          {},
        );
      }

      const forwardRefIndex = m.decorators.findIndex(
        (d) => d.name === 'ForwardRef',
      );
      if (forwardRefIndex > -1) {
        m.decorators[forwardRefIndex] = this.createDecorator(
          new Call(new Identifier(Decorators.ForwardRefProp), undefined, []),
          {},
        );
      }
    });

    members.forEach((m) => {
      if (!(m instanceof Property)) {
        warn(
          `${this.name} ComponentBindings has non-property member: ${m._name}`,
        );
        return;
      }
      if (m.decorators.length !== 1) {
        if (m.decorators.length === 0) {
          warn(
            `${this.name} ComponentBindings has property without decorator: ${m._name}`,
          );
        } else {
          warn(
            `${this.name} ComponentBindings has property with multiple decorators: ${m._name}`,
          );
        }
      } else if (getProps([m]).length === 0) {
        warn(
          `${this.name} ComponentBindings has property "${m._name}" with incorrect decorator: ${m.decorators[0].name}`,
        );
      }

      if (m.isNested && extractComplexType(m.type) === 'any') {
        warn(
          `One of "${m.name}" Nested property's types should be complex type`,
        );
      }

      if (RESERVED_NAMES.some((n) => n === m._name.toString())) {
        warn(
          `${this.name} ComponentBindings has property with reserved name: ${m._name}`,
        );
      }
    });
    const defaultNested = this.createDefaultNestedValues(members);
    if (defaultNested) {
      members.push(defaultNested);
    }
    return inheritMembers(
      this.heritageClauses,
      super.processMembers(
        members.concat(
          members
            .filter((m) => m.isState)
            .reduce((properties: Property[], p) => properties.concat(
              this.buildStateProperties(p as Property, members),
            ), []),
          members
            .filter((m) => m.isTemplate)
            .reduce((properties: Property[], p) => properties.concat(
              this.buildTemplateProperties(p as Property, members),
            ), []),
        ),
      ),
    );
  }

  get heritageProperties() {
    return (this.members.filter(
      (m) => m instanceof Property,
    ) as Property[]).map((p) => p.inherit());
  }

  compileDefaultProps() {
    return this.name.toString();
  }

  defaultPropsDest() {
    return this.name.toString();
  }

  getInitializerScope(component: string, name: string) {
    return `new ${component}().${name}`;
  }

  getImports(context: GeneratorContext) {
    const imports = this.members
      .filter((m) => !m.inherited)
      .reduce((result: TypeExpressionImports, m) => result.concat(m.getImports(context)), []);
    return mergeTypeExpressionImports(imports);
  }

  compileParentNested() {
    const parentClass = this.heritageClauses?.[0];
    const parentNesteds = parentClass?.members.filter(
      (m) => m.isNested && m instanceof Property && m.initializer,
    ).map((m) => new PropertyAssignment(
      new Identifier(m.name),
      new PropertyAccessChain(
        parentClass.typeNodes?.[0],
        SyntaxKind.QuestionDotToken,
        new PropertyAccess(
          new Identifier('__defaultNestedValues'),
          new Identifier(m.name),
        ),
      ),
    ));
    return parentNesteds;
  }

  shouldGenerateDefaultNested(members: (Property | Method)[]): boolean {
    return members.some(
      (member) => member.isNested && member instanceof Property && member.initializer,
    );
  }

  createDefaultNestedValues(members: (Property | Method)[]): Property | null {
    if (this.shouldGenerateDefaultNested(members)) {
      const initializerArray = members.reduce((accum, member) => {
        if (member.isNested && member instanceof Property && member.initializer) {
          accum.push({ name: member.name, initializer: member.initializer });
        }
        return accum;
      }, [] as { name: string; initializer: Expression }[]);

      const defaultNestedInitializer = initializerArray.length
        ? new ObjectLiteral(
          initializerArray
            .map(
              ({ name, initializer }) => new PropertyAssignment(new Identifier(name), initializer),
            )
            .concat(this.compileParentNested() || []),
          true,
        )
        : undefined;

      return this.createProperty(
        [new Decorator(new Call(new Identifier('OneWay'), undefined, []), {})],
        undefined,
        new Identifier('__defaultNestedValues'),
        undefined,
        undefined,
        defaultNestedInitializer,
      );
    }

    return null;
  }
}

const omit = (members: string[]) => (p: Property | Method) => !members.some((m) => m === p.name);
const pick = (members: string[]) => (p: Property | Method) => members.some((m) => m === p.name);

function processMembersFromType(
  members: (Property | Method)[],
  baseComponentInput: string,
  componentInput: ComponentInput,
) {
  return (members as Property[]).map((p) => {
    const m = p.inherit();
    m.inherited = false;
    if (m.initializer) {
      m.initializer = new SimpleExpression(
        `${componentInput.getInitializerScope(baseComponentInput, m.name)}`,
      );
    }
    return m;
  });
}

function removeDuplicates(members: (Property | Method)[]) {
  const dictionary = members.reduce(
    (d: { [name: string]: Property | Method }, m) => {
      d[m.name] = m;
      return d;
    },
    {},
  );

  return Object.keys(dictionary).map((k) => dictionary[k]);
}

export function membersFromTypeDeclaration(
  type: TypeExpression,
  context: GeneratorContext,
): (Property | Method)[] {
  let result: (Property | Method)[] = [];

  if (
    type instanceof TypeReferenceNode
    && (type.type.toString() === 'Omit' || type.type.toString() === 'Pick')
    && type.typeArguments.length
    && type.typeArguments[0] instanceof TypeReferenceNode
  ) {
    const componentInput = findComponentInput(
      type.typeArguments[0] as TypeReferenceNode,
      context,
    );
    const members = getMemberListFromTypeExpression(
      type.typeArguments[1],
      context,
    );
    if (componentInput instanceof ComponentInput) {
      const filter = type.type.toString() === 'Omit' ? omit(members) : pick(members);
      const componentInputName = (type
        .typeArguments[0] as TypeReferenceNode).type
        .toString()
        .replace('typeof ', '');
      result = processMembersFromType(
        componentInput.members.filter(filter),
        componentInputName,
        componentInput,
      );
    }
  } else if (type instanceof TypeReferenceNode) {
    const componentInput = findComponentInput(type, context);
    const componentInputName = type.type.toString().replace('typeof ', '');
    if (componentInput) {
      result = processMembersFromType(
        componentInput.members,
        componentInputName,
        componentInput,
      );
    }
  }

  if (type instanceof IntersectionTypeNode) {
    result = type.types.reduce(
      (members: (Property | Method)[], t) => members.concat(membersFromTypeDeclaration(t, context)),
      [],
    );
  }

  return removeDuplicates(result);
}
