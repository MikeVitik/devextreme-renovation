import * as Preact from "preact";
import { useState } from "preact/hooks";

import ButtonWithTemplate from "../../../../../components/button-with-template";
import Counter from "../../../../../components/counter";

import Nested from "../../../../../components/nested";

const buttonTemplate = ({ text }) => (
  <div style={{ border: "1px solid blue" }}>{text + "!"}</div>
);

export default () => {
  const [counterValue, counterValueChange] = useState(15);
  return (
    <div>
      <ButtonWithTemplate
        text={"With Template"}
        template={buttonTemplate}
      ></ButtonWithTemplate>
      <ButtonWithTemplate text={"Without Template"}></ButtonWithTemplate>
      <form>
        <Counter
          id="counter-control"
          value={counterValue}
          valueChange={counterValueChange}
        ></Counter>
      </form>
      <div id="counter-form-value">{counterValue}</div>
      <Nested
        rows={[
          { cells: [{ gridData: "cell11" }, "cell12"] },
          { cells: ["cell21", "cell22"] },
        ]}
      ></Nested>
      <Nested rows={[{ cells: ["cell31", { gridData: "cell32" }] }]}></Nested>
      <Nested
        rows={[{ cells: [{ gridData: "cell41" }, { gridData: "cell42" }] }]}
      ></Nested>
      <Nested rows={[]}></Nested>
      <br></br>
      Default values:
      <div style={{ border: "1px solid" }}>
        Just nested:
        <Nested rows={[{ cells: ["defaultValue"] }]}></Nested>
        <br />
        Nested Row:
        <Nested rows={[{ cells: ["defaultValue"] }]}></Nested>
        <br />
        Nested Row with not default Row:
        <Nested
          rows={[{ cells: ["defaultValue"] }, { cells: ["cell11", "cell12"] }]}
        ></Nested>
        <br />
        Nested Cell:
        <Nested rows={[{ cells: ["defaultValue"] }]}></Nested>
        <br />
        Nested Cell with not default Cell:
        <Nested rows={[{ cells: ["defaultValue", "notDefault"] }]}></Nested>
      </div>
    </div>
  );
};
