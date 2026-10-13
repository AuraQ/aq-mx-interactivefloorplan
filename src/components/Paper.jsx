import React, { Component, createElement } from "react";

import * as fabric from "fabric";
import { v4 as uuidv4 } from "uuid";
import { Tooltip } from "./Tooltip";

const DEBUG_MODE = false;

const debounce = (callback, wait) => {
    let timeoutId = null;
    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback(...args);
        }, wait);
    };
};

export class Paper extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            ids: {
                canvasWrapperId: uuidv4(),
                canvasId: uuidv4()
            },
            canvas: null,
            wrapper: null,
            zoomOutFactor: 1.05,
            zoomInFactor: 0.95,
            mdp: null,
            pausePanning: false,
            zoomStartScale: null,
            eventsInitialised: false,
            selectedItems: [],
            tooltip: {
                visible: false,
                left: 0,
                top: 0,
                content: undefined
            }
        };
        this.selectItem = this.selectItem.bind(this);
        this.deselectItem = this.deselectItem.bind(this);
        this.updateViewBoxPosition = this.updateViewBoxPosition.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.resetPosition = this.resetPosition.bind(this);
        this.paperRef = React.createRef();
        this.fullRender = true;
    }

    onMouseWheel(opt) {
        // Zoom to the current mouse position
        const { canvas } = this.state;
        var delta = opt.e.deltaY;
        var zf = opt.e.deltaY < 0 ? this.state.zoomOutFactor : this.state.zoomInFactor;
        var zoom = canvas.getZoom() * zf;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);

        //var paper = this.state.canvas;
        //var zf = opt.e.deltaY < 0 ? this.state.zoomOutFactor : this.state.zoomInFactor;
        //var zoom = paper.getZoom() * zf;
        //paper.setZoom(zoom);

        opt.e.preventDefault();
        opt.e.stopPropagation();
    }

    onMouseDown(evt) {
        if (evt.e.type.startsWith("touch")) {
            return;
        }

        const { canvas } = this.state;

        if (evt.e.ctrlKey === true) {
            if (this.props.readOnly) {
                return;
            }

            canvas.selection = false;
            this.setState({ isDrawingPath: true });

            // const pointer = fabric.util.getPointer(evt);
            const pointer = evt.scenePoint;
            const point = { x: pointer.x, y: pointer.y };

            // Check if clicking near the first point to close
            if (this.state.drawingPath && this.state.drawingPath.length >= 3) {
                const first = this.state.drawingPath[0];
                const dist = Math.sqrt(Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2));
                if (dist < 15) {
                    this.closePath();
                    return;
                }
            }

            const drawingPath = this.state.drawingPath || [];
            drawingPath.push(point);
            this.setState({ drawingPath });

            this.renderDrawingPath(drawingPath);
        } else if (evt.e.altKey === true) {
            this.setState({ isDragging: true });
            canvas.selection = false;

            if (!this.props.readOnly && evt.target && evt.target.type === "group" && evt.target.selectable) {
                evt.target.set({
                    lockMovementX: false,
                    lockMovementY: false
                });
                this.setState({ movingItem: evt.target });
                canvas.setActiveObject(evt.target);
            } else {
                this.setState({ mdp: { x: evt.e.screenX, y: evt.e.screenY } });
            }
        } else {
            this.setState({ isDragging: false, isDrawingPath: false });
            canvas.selection = true;
        }
    }

    renderDrawingPath(drawingPath) {
        const { canvas } = this.state;

        // Remove previous temp path
        if (this.state.tempPathObject) {
            canvas.remove(this.state.tempPathObject);
        }
        // Remove previous temp vertices
        if (this.state.tempVertices) {
            this.state.tempVertices.forEach(v => canvas.remove(v));
        }

        this.setState({ tempVertices: [] });

        // Draw polyline
        if (drawingPath?.length >= 2) {
            const polyline = new fabric.Polyline(drawingPath, {
                fill: "rgba(0, 150, 255, 0.15)",
                stroke: "#0096ff",
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false
            });
            this.setState({ tempPathObject: polyline });
            canvas.add(polyline);
        }

        const tempVertices = this.state.tempVertices || [];
        // Draw vertex circles
        drawingPath?.forEach((pt, i) => {
            const circle = new fabric.Circle({
                left: pt.x - 5,
                top: pt.y - 5,
                radius: 5,
                fill: i === 0 ? "#ff0000" : "#0096ff",
                stroke: "#ffffff",
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            tempVertices.push(circle);
            canvas.add(circle);
        });

        this.setState({ tempVertices });

        canvas.requestRenderAll();
    }

    closePath() {
        const { canvas, drawingPath } = this.state;

        // Remove temp objects
        if (this.state.tempPathObject) {
            canvas.remove(this.state.tempPathObject);
        }
        if (this.state.tempVertices) {
            this.state.tempVertices.forEach(v => canvas.remove(v));
        }

        // Build SVG path string
        const pathString = drawingPath?.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ") + " Z";

        // Create final closed path
        const path = new fabric.Path(pathString, {
            fill: "rgba(0, 150, 255, 0.2)",
            stroke: "#0096ff",
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        canvas.add(path);
        canvas.requestRenderAll();

        // Pass path string back to Mendix
        if (this.props.onPathCreated) {
            this.props.onPathCreated(pathString);
        }

        // Reset state
        this.setState({
            drawingPath: null,
            tempPathObject: null,
            tempVertices: null,
            isDrawingPath: false
        });
    }

    onMouseUp(evt) {
        if (evt.e.type.startsWith("touch")) {
            return;
        }

        const { canvas } = this.state;
        if (this.state.movingItem && this.state.isDragging) {
            const item = this.state.movingItem;
            item.set({
                lockMovementX: true,
                lockMovementY: true
            });
            item.setCoords();

            if (item.mxItem && this.props.onItemMoved) {
                this.props.onItemMoved(item.mxItem, item.left, item.top);
            }

            this.setState({ movingItem: null });
            canvas.discardActiveObject();
        }

        this.setState({ isDragging: false });
        this.updateViewBoxPosition(evt);
        this.setState({ mdp: null });
    }

    onTouchGesture(e) {
        const { canvas } = this.state;
        if (e.e.touches && e.e.touches.length === 2) {
            this.setState({ pausePanning: true });
            var point = new fabric.Point(e.self.x, e.self.y);
            if (e.self.state === "start") {
                this.setState({ zoomStartScale: canvas.getZoom() });
            }
            var delta = this.state.zoomStartScale * e.self.scale;
            canvas.zoomToPoint(point, delta);
            this.setState({ pausePanning: false });
        }
    }

    onTouchDrag(e) {
        const { canvas } = this.state;
        if (this.state.pausePanning === false && e.e.touches && e.e.touches.length === 1) {
            if (e.self.state === "down") {
                this.setState({ mdp: { x: e.self.x, y: e.self.y } });
            } else if (e.self.state === "up") {
                this.setState({ mdp: null });
            } else {
                var delta = new fabric.Point(e.self.x - this.state.mdp.x, e.self.y - this.state.mdp.y);
                if (Math.abs(delta.x) <= 50 && Math.abs(delta.y) <= 50) {
                    canvas.relativePan(delta);
                }
                this.setState({ mdp: { x: e.self.x, y: e.self.y } });
            }
        }
    }

    onMultiselectionEvent(evt) {
        // we don't care about evt.deselected with our multi select support as we are managing selected state within the item itself
        // (to allow a click to deselect)
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt && evt.selected && evt.selected.length > 0) {
            const isMulti = evt.selected.length > 1;

            this.deSelectAllItems(isMulti);

            if (this.props.onMultiSelectionStart && isMulti) {
                this.props.onMultiSelectionStart();
            }

            evt.selected.forEach(item => {
                if (item.areaId) {
                    if (this.props.onAreaSelection) {
                        this.props.onAreaSelection(item.mxItem);
                    }
                } else {
                    item.selected = true;
                    this.selectItem(item, isMulti);
                }
            });

            if (this.props.onMultiSelectionEnd && isMulti) {
                let selectedGroups = "";
                let sep = "";
                this.state.selectedItems.forEach(item => {
                    selectedGroups += sep + item.mxId;
                    sep = ",";
                });

                this.props.onMultiSelectionEnd(selectedGroups);
            }

            this.state.canvas.discardActiveObject();
        }
    }

    onSelectionCreated(evt) {
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt.selected.length > 0) {
            evt.selected.forEach(item => {
                if (item.areaId) {
                    if (this.props.onAreaSelection) {
                        this.props.onAreaSelection(item.mxItem);
                    }
                } else {
                    this.selectItem(item);
                }
            });
        }
    }

    onSelectionUpdated(evt) {
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt.deselected.length > 0) {
            evt.deselected.forEach(item => {
                if (item.areaId) {
                    if (this.props.onAreaDeselection) {
                        this.props.onAreaDeselection(item.mxItem);
                    }
                } else {
                    this.deselectItem(item);
                }
            });
        }
        if (evt.selected.length > 0) {
            evt.selected.forEach(item => {
                if (item.areaId) {
                    if (this.props.onAreaSelection) {
                        this.props.onAreaSelection(item.mxItem);
                    }
                } else {
                    this.selectItem(item);
                }
            });
        }
    }

    onSelectionCleared(evt) {
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt.deselected.length > 0) {
            evt.deselected.forEach(item => {
                if (item.areaId) {
                    if (this.props.onAreaDeselection) {
                        this.props.onAreaDeselection(item.mxItem);
                    }
                } else {
                    this.deselectItem(item);
                }
            });
        }
    }

    resizeCanvas(resetZoom) {
        const { canvas, wrapper } = this.state;
        if (canvas === null || canvas === undefined) return;

        canvas.setDimensions({
            width: wrapper.offsetWidth,
            height: wrapper.offsetHeight
        });
        if (resetZoom && this.props.autoZoom) {
            const zoom = this.calculateAutoZoom(canvas.width, canvas.height);
            canvas.setZoom(zoom);
        }
        canvas.requestRenderAll();
    }

    selectItem(item, isMulti = false) {
        const { canvas } = this.state;

        if (item != null && item.type === "group") {
            for (var key of Object.keys(item.elementProps)) {
                const elementProps = item.elementProps[key];
                const element = item.item(elementProps.index);
                element.set(elementProps.selected);
            }

            canvas.requestRenderAll();

            // call back
            if (item.mxItem && this.props.onSelection && !isMulti) {
                this.props.onSelection(item.mxItem);
            }

            if (item.mxItem && this.props.onMultiSelection && isMulti) {
                this.props.onMultiSelection(item.mxItem);
            }

            const index = this.state.selectedItems.indexOf(item);
            if (index === -1) this.state.selectedItems.push(item);
        }
    }

    deSelectAllItems(isMulti = false) {
        const selectedItems = this.state.selectedItems.slice();

        selectedItems.forEach(item => {
            this.deselectItem(item, isMulti);
        });
    }

    deselectItem(item, isMulti = false) {
        const { canvas } = this.state;

        if (item != null && item.type === "group") {
            for (var key of Object.keys(item.elementProps)) {
                const elementProps = item.elementProps[key];
                const element = item.item(elementProps.index);
                element.set(elementProps.deselected);
            }

            canvas.requestRenderAll();

            // call back
            if (item.mxItem && this.props.onDeselection && !isMulti) {
                this.props.onDeselection(item.mxItem);
            }

            // Remove from state
            const index = this.state.selectedItems.indexOf(item);
            if (index > -1) this.state.selectedItems.splice(index, 1);
        }
    }

    updateViewBoxPosition(evt) {
        const { canvas } = this.state;

        if (evt.e.type.startsWith("touch")) {
            return;
        }

        if (this.state.mdp != null) {
            var deltaX = evt.e.screenX - this.state.mdp.x;
            var deltaY = evt.e.screenY - this.state.mdp.y;
            this.setState({ mdp: { x: evt.e.screenX, y: evt.e.screenY } });
            var delta = new fabric.Point(deltaX, deltaY);
            canvas.relativePan(delta);
        }
    }

    showTooltip(position, area) {
        if (!this.props.enableTooltips) return;

        this.setState({
            tooltip: {
                visible: true,
                left: position.x + 10,
                top: position.y + 10,
                content: this.props.tooltipContent(area.mxItem)
            }
        });
    }

    moveTooltip(position) {
        if (!this.state.tooltip.visible || !this.props.enableTooltips) return;

        this.setState({
            tooltip: {
                ...this.state.tooltip,
                left: position.x + 10,
                top: position.y + 10
            }
        });
    }

    hideTooltip() {
        if (!this.state.tooltip.visible) return;

        this.setState({
            tooltip: {
                ...this.state.tooltip,
                visible: false
            }
        });
    }

    // reset zoom to 1.0
    resetZoom() {
        const { canvas } = this.state;
        canvas.setZoom(1.0);
    }

    // reset viewport position to 0,0
    resetPosition() {
        const { canvas } = this.state;
        canvas.absolutePan(new fabric.Point(0, 0));
    }

    calculateAutoZoom(containerWidth, containerHeight) {
        const floorplanWidth = parseFloat(this.props.floorplanWidth);
        const floorplanHeight = parseFloat(this.props.floorplanHeight);
        if (!floorplanWidth || !floorplanHeight || !containerWidth || !containerHeight) {
            return this.props.initialZoom || 1.0;
        }
        return Math.min(containerWidth / floorplanWidth, containerHeight / floorplanHeight);
    }

    async initCanvas(paper) {
        //paper.selection = false;

        // 1. Background image
        if (this.props.backgroundImageUrl) {
            const bgImage = await fabric.FabricImage.fromURL(this.props.backgroundImageUrl);
            bgImage.selectable = false;
            bgImage.evented = false;
            // bgImage.left = 0;
            // bgImage.top = 0;
            // bgImage.originX = 'left',
            // bgImage.originY = 'top',
            bgImage.setPositionByOrigin(new fabric.Point(0, 0), "left", "top");
            bgImage.scale(1);
            paper.add(bgImage);
        }

        var baseGroupOptions = {
            hasControls: false,
            hasBorders: false,
            borderColor: "red",
            borderWidth: 2,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockScewingX: true,
            lockScewingY: true,
            lockRotation: true,
            stroke: "#000000",
            strokeOpacity: 1,
            fill: "none"
        };

        // 2. Areas (behind devices)
        if (this.props.areas) {
            this.props.areas.forEach(area => {
                // Look up props from elementProps based on status (same pattern as groups)
                let statusProps = {};
                if (area.propsName && this.props.elementProps[area.propsName]) {
                    const propsCollection = this.props.elementProps[area.propsName];
                    const statusPropsCollection = propsCollection[area.status] || propsCollection.__default || {};
                    // Areas don't have selected/deselected states, so just use the status props directly
                    // or look for a "default" key within the status
                    statusProps = statusPropsCollection.deselected || statusPropsCollection;
                }

                const path = new fabric.Path(area.path, {
                    fill: "transparent",
                    stroke: "#0096ff",
                    strokeWidth: 1,
                    selectable: false,
                    evented: true,
                    hoverCursor: "pointer",
                    ...area.props, // Inline props (fallback)
                    ...statusProps // Status-based props (override)
                });
                path.areaId = area.id;
                path.mxItem = area.mxItem;
                path.on("mousedown", e => {
                    if (!this.state.isDragging && !this.state.isDrawingPath) {
                        if (this.props.onAreaSelection) {
                            this.props.onAreaSelection(path.mxItem);
                        }
                    }
                });
                if (this.props.enableTooltips) {
                    path.on("mouseover", e => {
                        this.showTooltip({ x: e.e.offsetX, y: e.e.offsetY }, area);
                    });
                    path.on("mouseout", () => {
                        this.hideTooltip();
                    });
                    path.on("mousemove", e => {
                        this.moveTooltip({ x: e.e.offsetX, y: e.e.offsetY });
                    });
                }
                paper.add(path);
            });
        }

        for (let i = 0; i < this.props.groups.length; i++) {
            const groupData = this.props.groups[i];
            const groupItems = [];
            const groupElementProps = {};
            for (let j = 0; j < groupData.elements.length; j++) {
                const elementData = groupData.elements[j];
                let element;
                let selectedProps;
                let deselectedProps;
                const propsCollection = this.props.elementProps[elementData.props] || "{}";
                const statusPropsCollection = propsCollection[groupData.status] || "{}";

                if (groupData.elementPropsType === "inline") {
                    selectedProps = elementData.props;
                } else {
                    selectedProps = statusPropsCollection.selected || "{}";
                }

                if (groupData.elementPropsType === "inline") {
                    deselectedProps = elementData.props;
                } else {
                    deselectedProps = statusPropsCollection.deselected || "{}";
                }

                switch (elementData.type) {
                    case "path":
                        element = new fabric.Path(elementData.path, { originX: "center", originY: "center" });
                        break;
                    case "rect":
                        element = new fabric.Rect({
                            left: elementData.left,
                            top: elementData.top,
                            width: elementData.width,
                            height: elementData.height
                        });
                        break;
                    case "triangle":
                        element = new fabric.Triangle({
                            left: elementData.left,
                            top: elementData.top,
                            width: elementData.width,
                            height: elementData.height
                        });
                        break;
                    case "line":
                        element = new fabric.Line(elementData.coords);
                        break;
                    case "image":
                        element = await this.imagefromUrlWrapper(elementData.href, {
                            left: parseFloat(elementData.x) || 0,
                            top: parseFloat(elementData.y) || 0
                        });
                        if (DEBUG_MODE) console.debug("Element after set:", element);
                        break;
                    default:
                        break;
                }
                const elementKey = `${elementData.type}_${j}`;
                element.set(deselectedProps); // we want to set deselected as default
                groupElementProps[elementKey] = {};
                groupElementProps[elementKey].index = j;
                groupElementProps[elementKey].selected = selectedProps;
                groupElementProps[elementKey].deselected = deselectedProps;

                groupItems.push(element);
            }

            var group = new fabric.Group(groupItems, { originX: "left", originY: "top" });
            if (DEBUG_MODE) console.log("Group bounds:", group.getBoundingRect());
            const cursor = groupData.isSelectable ? "pointer" : "default";
            group.setOptions({
                ...baseGroupOptions,
                ...groupData.props,
                selectable: groupData.isSelectable,
                hoverCursor: cursor
            });
            group.mxId = groupData.id;
            group.mxItem = groupData.mxItem;
            group.elementProps = groupElementProps;

            paper.add(group);
        }

        paper.requestRenderAll();

        if (!this.state.eventsInitialised) {
            paper.upperCanvasEl.addEventListener(
                "mousedown",
                e => {
                    if (e.altKey) {
                        this.setState({ isDragging: true });
                    }
                },
                true
            ); // 'true' = capture phase, fires before Fabric

            paper.on("mouse:wheel", this.onMouseWheel.bind(this));
            paper.on("mouse:down", this.onMouseDown.bind(this));
            paper.on("mouse:up", this.onMouseUp.bind(this));
            paper.on("mouse:move", this.updateViewBoxPosition);
            paper.on("touch:gesture", this.onTouchGesture.bind(this));
            paper.on("touch:drag", this.onTouchDrag.bind(this));

            //Multiselection
            if (!this.props.multiselect) {
                paper.on("selection:created", this.onSelectionCreated.bind(this));
                paper.on("selection:updated", this.onSelectionUpdated.bind(this));
                paper.on("selection:cleared", this.onSelectionCleared.bind(this));
            } else {
                paper.on("selection:created", this.onMultiselectionEvent.bind(this));
                paper.on("selection:updated", this.onMultiselectionEvent.bind(this));
                paper.on("selection:cleared", this.onMultiselectionEvent.bind(this));
            }
            window.addEventListener("resize", () => {
                debounce(this.resizeCanvas.bind(this), 100)();
            });

            this.setState({ eventsInitialised: true });
        }
    }

    componentDidMount() {
        const el = this.paperRef.current;
        const paper = new fabric.Canvas(this.state.ids.canvasId, {
            height: el.offsetHeight,
            width: el.offsetWidth,
            backgroundColor: this.props.backgroundColor
        });
        paper.absolutePan(new fabric.Point(this.props.initialLeft, this.props.initialTop));

        const zoom = this.props.autoZoom
            ? this.calculateAutoZoom(el.offsetWidth, el.offsetHeight)
            : this.props.initialZoom;
        paper.setZoom(zoom);

        this.setState({
            wrapper: el,
            canvas: paper
        });

        this.initCanvas(paper);
    }

    shouldComponentUpdate(nextProps, nextState) {
        this.resizeCanvas(false);
        this.fullRender = !(
            nextProps.groups === this.props.groups &&
            nextProps.elementProps === this.props.elementProps &&
            nextProps.areas === this.props.areas &&
            nextProps.backgroundImageUrl === this.props.backgroundImageUrl &&
            nextProps.refreshCounter === this.props.refreshCounter
        );

        return this.fullRender || !(nextState.tooltip === this.state.tooltip);
    }

    async componentDidUpdate(prevProps) {
        const { canvas } = this.state;

        if (!canvas) {
            return;
        }

        if (this.fullRender) {
            if (DEBUG_MODE) console.log("Refresh triggered - clearing and reinitializing canvas (first pass)");
            canvas.clear();
            canvas.set({ backgroundColor: this.props.backgroundColor });
            await this.initCanvas(canvas);
        }
    }

    render() {
        return (
            <div ref={this.paperRef} id={this.state.ids.canvasWrapperId} className="canvasWrapper">
                <canvas id={this.state.ids.canvasId} className="canvasPaper"></canvas>
                {this.state.tooltip.visible && (
                    <Tooltip top={this.state.tooltip.top} left={this.state.tooltip.left}>
                        {this.state.tooltip.content}
                    </Tooltip>
                )}
            </div>
        );
    }
}
