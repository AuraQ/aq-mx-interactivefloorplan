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
        this.onAreaSelection = this.onAreaSelection.bind(this);
        this.onAreaDeselection = this.onAreaDeselection.bind(this);
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

    onAreaSelection = mxItem => {
        if (this.props.onAreaSelection !== undefined) {
            const onAreaSelectionAction = this.props.onAreaSelection.get(mxItem);
            if (onAreaSelectionAction.canExecute && !onAreaSelectionAction.isExecuting) {
                onAreaSelectionAction.execute();
            }
        }
    };

    onAreaDeselection = mxItem => {
        if (this.props.onAreaDeselection !== undefined) {
            const onAreaDeselectionAction = this.props.onAreaDeselection.get(mxItem);
            if (onAreaDeselectionAction.canExecute && !onAreaDeselectionAction.isExecuting) {
                onAreaDeselectionAction.execute();
            }
        }
    };

    onItemMoved = (mxItem, left, top) => {
        if (this.props.movedItemX) {
            this.props.movedItemX.setValue(left.toString());
        }
        if (this.props.movedItemY) {
            this.props.movedItemY.setValue(top.toString());
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
        if (!this.props.enableAreaTooltips) return <></>;

        return this.props.areaTooltipContent.get(mxItem);
    };

    render() {
        if (this.props.data.status !== "available" || this.props.instanceData.status !== "available") {
            return <></>;
        }
        const elementPropsValue = this.props.elementPropsJson.value || "{}";
        const elementProps = JSON.parse(elementPropsValue);

        var groups = [];
        //debugger;
        const instanceItems = this.props.instanceData.items.reduce((a, v) => {
            const groupId = this.props.instanceGroupId.get(v).value;
            const groupStatus = this.props.instanceGroupStatus.get(v).value;
            const groupIsSelectable = this.props.instanceGroupIsSelectable.get(v).value;
            const groupData = {};
            groupData.status = groupStatus;
            groupData.isSelectable = groupIsSelectable;

            return { ...a, [groupId]: groupData };
        }, {});

        for (var i = 0; i < this.props.data.items.length; i++) {
            const mxItem = this.props.data.items[i];
            const groupElementsValue = this.props.groupElementsJson.get(mxItem).value || "[]";

            const groupProps = elementProps[this.props.groupPropsName.get(mxItem).value] || "{}";

            var group = {};
            group.mxItem = mxItem;
            group.id = this.props.groupId.get(mxItem).value;
            if (instanceItems[group.id]) {
                group.status = (instanceItems[group.id].status || "__default").toLowerCase();
                group.isSelectable = instanceItems[group.id].isSelectable;
            } else {
                group.status = "__default";
                group.isSelectable = this.props.groupIsSelectable.get(mxItem).value;
            }
            group.props = groupProps;
            group.elements = JSON.parse(groupElementsValue);
            group.elementPropsType = this.props.groupElementPropsType.get(mxItem).value.toLowerCase();

            groups.push(group);
        }

        // Build areas
        var areas = [];
        if (this.props.areaData?.status === "available" && this.props.areaData.items) {
            for (var j = 0; j < this.props.areaData.items.length; j++) {
                const mxItem = this.props.areaData.items[j];
                const area = {};
                area.mxItem = mxItem;
                area.id = this.props.areaId.get(mxItem).value;
                area.path = this.props.areaPath.get(mxItem).value;
                area.props = JSON.parse(this.props.areaProps.get(mxItem).value || "{}");
                area.propsName = this.props.areaPropsName?.get(mxItem).value;
                area.status = (this.props.areaStatus?.get(mxItem).value || "__default").toLowerCase();

                areas.push(area);
            }
        }

        if (DEBUG_MODE) {
            console.log(
                "InteractiveFloorplan render - groups:",
                groups.length,
                "areas:",
                areas.length,
                "refreshCounter:",
                this.props.refreshCounter?.value
            );
        }

        let initialZoom = 1.0;
        const autoInitialZoom = this.props.autoInitialZoom === true || this.props.autoInitialZoom?.value === true;
        const floorplanWidth = this.props.floorplanWidth ? parseFloat(this.props.floorplanWidth.value) : null;
        const floorplanHeight = this.props.floorplanHeight ? parseFloat(this.props.floorplanHeight.value) : null;

        if (this.props.initialZoom) {
            initialZoom = parseFloat(this.props.initialZoom.value);
        }

        let initialLeft = 0;
        if (this.props.initialLeft) {
            initialLeft = parseFloat(this.props.initialLeft.value);
        }

        let initialTop = 0;
        if (this.props.initialTop) {
            initialTop = parseFloat(this.props.initialTop.value);
        }

        let backgroundImageUrl = null;
        if (this.props.backgroundImageBase64?.value) {
            backgroundImageUrl = this.props.backgroundImageBase64.value;
            // const base64 = this.props.backgroundImageBase64.value;
            // Add data URI prefix if not already present
            // backgroundImageUrl = base64.startsWith('data:')
            //     ? base64
            //     : `data:image/png;base64,${base64}`;
        }

        const readOnly = this.props.readOnly?.value === true || this.props.readOnly?.value === "true";

        return (
            <Paper
                initialLeft={initialLeft}
                initialTop={initialTop}
                floorplanWidth={floorplanWidth}
                floorplanHeight={floorplanHeight}
                autoZoom={autoInitialZoom}
                initialZoom={initialZoom}
                multiselect={this.props.multiselect}
                groups={groups}
                areas={areas}
                elementProps={elementProps}
                backgroundColor={this.props.backgroundColor}
                backgroundImageUrl={backgroundImageUrl}
                refreshCounter={this.props.refreshCounter?.value?.toNumber()}
                readOnly={readOnly}
                onSelection={this.onSelection}
                onDeselection={this.onDeselection}
                onMultiSelection={this.onMultiSelection}
                onMultiSelectionStart={this.onMultiSelectionStart}
                onMultiSelectionEnd={this.onMultiSelectionEnd}
                onAreaSelection={this.onAreaSelection}
                onAreaDeselection={this.onAreaDeselection}
                onItemMoved={this.onItemMoved}
                onPathCreated={this.onPathCreated}
                enableTooltips={this.props.enableAreaTooltips}
                tooltipContent={this.tooltipContent}
            ></Paper>
        );
    }
}
