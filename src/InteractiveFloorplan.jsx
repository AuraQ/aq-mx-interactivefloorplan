import React, { Component, createElement } from "react";

import { Paper } from "./components/Paper";
import "./ui/InteractiveFloorplan.css";

const DEBUG_MODE = false;

export default class InteractiveFloorplan extends Component {
    constructor(props) {
        super(props);

        this.onSelection = this.onSelection.bind(this);
        this.onDeselection = this.onDeselection.bind(this);
        this.onMultiSelection = this.onMultiSelection.bind(this);
        this.onMultiSelectionStart = this.onMultiSelectionStart.bind(this);
        this.onMultiSelectionEnd = this.onMultiSelectionEnd.bind(this);
        this.tooltipContent = this.tooltipContent.bind(this);
    }

    onSelection = mxItem => {
        if (this.props.onSelection !== undefined) {
            const onSelectionAction = this.props.onSelection.get(mxItem);
            if (onSelectionAction.canExecute && !onSelectionAction.isExecuting) {
                onSelectionAction.execute();
            }
        }
    };

    onMultiSelectionStart = () => {
        if (this.props.onMultiSelectionStart !== undefined) {
            const onMultiSelectionStartAction = this.props.onMultiSelectionStart;
            if (onMultiSelectionStartAction.canExecute && !onMultiSelectionStartAction.isExecuting) {
                onMultiSelectionStartAction.execute();
            }
        }
    };

    onMultiSelection = mxItem => {
        if (this.props.onMultiSelection !== undefined) {
            const onMultiSelectionAction = this.props.onMultiSelection.get(mxItem);
            if (onMultiSelectionAction.canExecute && !onMultiSelectionAction.isExecuting) {
                onMultiSelectionAction.execute();
            }
        }
    };

    onMultiSelectionEnd = selectedGroups => {
        if (this.props.selectedGroups) {
            this.props.selectedGroups.setValue(selectedGroups);
        }
        if (this.props.onMultiSelectionEnd !== undefined) {
            const onMultiSelectionEndAction = this.props.onMultiSelectionEnd;
            if (onMultiSelectionEndAction.canExecute && !onMultiSelectionEndAction.isExecuting) {
                onMultiSelectionEndAction.execute();
            }
        }
    };

    onDeselection = mxItem => {
        if (this.props.onDeselection !== undefined) {
            const onDeselectionAction = this.props.onDeselection.get(mxItem);
            if (onDeselectionAction.canExecute && !onDeselectionAction.isExecuting) {
                onDeselectionAction.execute();
            }
        }
    };

    onItemMoved = (mxItem, left, top) => {
        if (this.props.movedItemX) {
            this.props.movedItemX.setTextValue(left.toString());
        }
        if (this.props.movedItemY) {
            this.props.movedItemY.setTextValue(top.toString());
        }
        if (this.props.onItemMoved !== undefined) {
            const action = this.props.onItemMoved.get(mxItem);

            if (action.canExecute && !action.isExecuting) {
                action.execute();
            }
        }
    };

    onPathCreated = verticesJson => {
        if (this.props.pathVertices) {
            this.props.pathVertices.setValue(verticesJson);
        }
        if (this.props.onPathCreated?.canExecute && !this.props.onPathCreated.isExecuting) {
            this.props.onPathCreated.execute();
        }
    };

    tooltipContent = mxItem => {
        if (!this.props.enableTooltips) return <></>;

        return this.props.tooltipContent.get(mxItem);
    };

    render() {
        if (this.props.data.status !== "available") {
            return this.props.loadingContent;
        }

        const groupCategoriesString = this.props.groupCategoriesJSON.value || "{}";
        const groupCategories = JSON.parse(groupCategoriesString);

        var groups = [];

        for (var i = 0; i < this.props.data.items.length; i++) {
            const mxItem = this.props.data.items[i];

            const groupElementsString = this.props.groupElementsJSON.get(mxItem).value || "[]";
            const groupElements = JSON.parse(groupElementsString);
            const groupPropertiesString = this.props.groupPropertiesJSON.get(mxItem).value || "{}";
            const groupProperties = JSON.parse(groupPropertiesString);

            var group = {};
            group.mxItem = mxItem;
            group.id = this.props.groupId.get(mxItem).value;
            group.category = this.props.groupCategory.get(mxItem).value;
            group.status = (this.props.groupStatus.get(mxItem).value || "__default").toLowerCase();
            group.properties = groupProperties;
            group.isSelectable = this.props.groupIsSelectable.get(mxItem).value;
            group.elements = groupElements;
            if (this.props.enableTooltips) group.tooltipOn = this.props.groupTooltipOn.get(mxItem).value;

            groups.push(group);
        }

        if (DEBUG_MODE) {
            console.log("InteractiveFloorplan render - groups:", groups.length);
        }

        return (
            <Paper
                groups={groups}
                initialLeft={parseFloat(this.props.initialLeft?.value) || 0}
                initialTop={parseFloat(this.props.initialTop?.value) || 0}
                initialZoom={parseFloat(this.props.initialZoom?.value) || 1.0}
                autoZoom={this.props.autoInitialZoom?.value}
                backgroundColour={this.props.backgroundColour}
                backgroundImageUrl={this.props.backgroundImage?.value?.uri}
                backgroundImageWidth={parseFloat(this.props.backgroundImageWidth?.value) || 0}
                backgroundImageHeight={parseFloat(this.props.backgroundImageHeight?.value) || 0}
                multiselect={this.props.multiselect}
                readOnly={this.props.readOnly?.value}
                groupCategories={groupCategories}
                enableTooltips={this.props.enableTooltips}
                tooltipContent={this.tooltipContent}
                onSelection={this.onSelection}
                onDeselection={this.onDeselection}
                onMultiSelection={this.onMultiSelection}
                onMultiSelectionStart={this.onMultiSelectionStart}
                onMultiSelectionEnd={this.onMultiSelectionEnd}
                onItemMoved={this.onItemMoved}
                onPathCreated={this.onPathCreated}
                className={this.props.className}
                style={this.props.style}
            ></Paper>
        );
    }
}
