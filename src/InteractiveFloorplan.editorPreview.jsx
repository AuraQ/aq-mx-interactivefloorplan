import { Component, createElement } from "react";
import { Paper } from "./components/Paper";

export class preview extends Component {
    render() {
        return <Paper />;
    }
}

export function getPreviewCss() {
    return require("./ui/InteractiveFloorplan.css");
}
