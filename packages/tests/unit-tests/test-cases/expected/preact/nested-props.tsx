export declare type GridColumnPropsType = {
  name: string;
  index: number;
  editing?: typeof ColumnEditingProps;
  custom?: typeof CustomProps[];
  defaultIndex: number;
  indexChange?: (index: number) => void;
};
export const GridColumnProps: GridColumnPropsType = {
  name: "",
  defaultIndex: 0,
  indexChange: () => {},
} as any as GridColumnPropsType;
export declare type CustomPropsType = {};
export const CustomProps: CustomPropsType = {};
export declare type AnotherCustomPropsType = {};
export const AnotherCustomProps: AnotherCustomPropsType = {};
export declare type EditingPropsType = {
  editEnabled?: boolean;
  custom?: typeof CustomProps[];
  anotherCustom?: typeof AnotherCustomProps;
};
export const EditingProps: EditingPropsType = {
  editEnabled: false,
};
export declare type ColumnEditingPropsType = {
  editEnabled?: boolean;
};
export const ColumnEditingProps: ColumnEditingPropsType = {
  editEnabled: false,
};
export declare type WidgetPropsType = {
  columns?: Array<typeof GridColumnProps | string>;
  editing: typeof EditingProps;
};
export const WidgetProps: WidgetPropsType = {
  get editing() {
    return EditingProps;
  },
};
export declare type PickedPropsType = {
  columns?: Array<typeof GridColumnProps | string>;
  editing: typeof EditingProps;
};
export const PickedProps: PickedPropsType = {
  editing: WidgetProps.editing,
};
