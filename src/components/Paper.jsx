import React, { Component, createElement } from "react";
import ReactDOM from "react-dom";
import { fabric } from "fabric";
import _, { times } from "lodash";
import { v4 as uuidv4 } from "uuid";

export class Paper extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            ids: {
                canvasWrapperId: uuidv4(),
                canvasId: uuidv4()
            },
            wrapperWidth: 600,
            wrapperHeight: 400,
            canvas: null,
            wrapper: null,
            zoomOutFactor: 1.05,
            zoomInFactor: 0.95,
            mdp: null,
            pausePanning: false,
            zoomStartScale: null,
            eventsInitialised: false,
            selectedItems: []
        };
        this.selectItem = this.selectItem.bind(this);
        this.deselectItem = this.deselectItem.bind(this);
        this.updateViewBoxPosition = this.updateViewBoxPosition.bind(this);
        this.resetZoom = this.resetZoom.bind(this);
        this.resetPosition = this.resetPosition.bind(this);

    }

    onMouseWheel(opt) {

        // Zoom to the current mouse position
        var paper = this.state.canvas;
        var delta = opt.e.deltaY;
        var zf = opt.e.deltaY < 0 ? this.state.zoomOutFactor : this.state.zoomInFactor;
        var zoom = paper.getZoom() * zf;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        paper.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        
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

        var paper = this.state.canvas;

        if (evt.e.ctrlKey === true) {
            paper.selection = false;
            this.state.isDrawingPath = true;

            const pointer = paper.getPointer(evt.e);
            const point = { x: pointer.x, y: pointer.y };

            if (!this.state.drawingPath) {
                this.state.drawingPath = [];
            }

            // Check if clicking near the first point to close
            if (this.state.drawingPath.length >= 3) {
                const first = this.state.drawingPath[0];
                const dist = Math.sqrt(
                    Math.pow(point.x - first.x, 2) + Math.pow(point.y - first.y, 2)
                );
                if (dist < 15) {
                    this.closePath();
                    return;
                }
            }

            this.state.drawingPath.push(point);
            this.renderDrawingPath();
            return;

        } else if (evt.e.altKey === true) {
            this.state.isDragging = true;
            paper.selection = false;

            if (evt.target && evt.target.type === "group" && evt.target.selectable) {
                evt.target.set({
                    lockMovementX: false,
                    lockMovementY: false
                });
                this.state.movingItem = evt.target;
                paper.setActiveObject(evt.target);
            } else {
                this.state.mdp = { x: evt.e.screenX, y: evt.e.screenY };
            }
        } else {
            this.state.isDragging = false;
            this.state.isDrawingPath = false;
            paper.selection = true;
        }
    }

    renderDrawingPath() {
        var paper = this.state.canvas;
        const points = this.state.drawingPath;

        // Remove previous temp path
        if (this.state.tempPathObject) {
            paper.remove(this.state.tempPathObject);
        }
        // Remove previous temp vertices
        if (this.state.tempVertices) {
            this.state.tempVertices.forEach(v => paper.remove(v));
        }

        this.state.tempVertices = [];

        // Draw polyline
        if (points.length >= 2) {
            const polyline = new fabric.Polyline(points, {
                fill: 'rgba(0, 150, 255, 0.15)',
                stroke: '#0096ff',
                strokeWidth: 2,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false
            });
            this.state.tempPathObject = polyline;
            paper.add(polyline);
        }

        // Draw vertex circles
        points.forEach((pt, i) => {
            const circle = new fabric.Circle({
                left: pt.x - 5,
                top: pt.y - 5,
                radius: 5,
                fill: i === 0 ? '#ff0000' : '#0096ff',
                stroke: '#ffffff',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            this.state.tempVertices.push(circle);
            paper.add(circle);
        });

        paper.requestRenderAll();
    }

    closePath() {
        var paper = this.state.canvas;
        const points = this.state.drawingPath;

        // Remove temp objects
        if (this.state.tempPathObject) {
            paper.remove(this.state.tempPathObject);
        }
        if (this.state.tempVertices) {
            this.state.tempVertices.forEach(v => paper.remove(v));
        }

        // Build SVG path string
        const pathString = points.map((pt, i) => {
            return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
        }).join(' ') + ' Z';

        // Create final closed path
        const path = new fabric.Path(pathString, {
            fill: 'rgba(0, 150, 255, 0.2)',
            stroke: '#0096ff',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        paper.add(path);
        paper.requestRenderAll();

        // Pass path string back to Mendix
        if (this.props.onPathCreated) {
            this.props.onPathCreated(pathString);
        }

        // Reset state
        this.state.drawingPath = null;
        this.state.tempPathObject = null;
        this.state.tempVertices = null;
        this.state.isDrawingPath = false;
    }

    onMouseUp(evt) {
        if (evt.e.type.startsWith("touch")) {
            return;
        }

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

            this.state.movingItem = null;
 
            this.state.canvas.discardActiveObject();
        }

        this.state.isDragging = false;
        this.updateViewBoxPosition(evt);
        this.state.mdp = null;
    }

    onTouchGesture(e) {
        var paper = this.state.canvas;
        if (e.e.touches && e.e.touches.length == 2) {
            this.state.pausePanning = true;
            var point = new fabric.Point(e.self.x, e.self.y);
            if (e.self.state == "start") {
                this.state.zoomStartScale = paper.getZoom();
            }
            var delta = this.state.zoomStartScale * e.self.scale;
            paper.zoomToPoint(point, delta);
            this.state.pausePanning = false;
        }
    }

    onTouchDrag(e) {
        var paper = this.state.canvas;
        if (this.state.pausePanning == false && e.e.touches && e.e.touches.length == 1) {
            if (e.self.state == "down") {
                this.state.mdp = { x: e.self.x, y: e.self.y };
            } else if (e.self.state == "up") {
                this.state.mdp = null;
            } else {
                var delta = new fabric.Point(e.self.x - this.state.mdp.x, e.self.y - this.state.mdp.y);
                if (Math.abs(delta.x) <= 50 && Math.abs(delta.y) <= 50) {
                    paper.relativePan(delta);
                }
                this.state.mdp = { x: e.self.x, y: e.self.y };
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

                item.selected = true;
                this.selectItem(item, isMulti);
                                
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
            evt.selected.forEach(this.selectItem);
        }
    }

    onSelectionUpdated(evt) {
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt.deselected.length > 0) {
            evt.deselected.forEach(this.deselectItem);
        }
        if (evt.selected.length > 0) {
            evt.selected.forEach(this.selectItem);
        }
    }

    onSelectionCleared(evt) {
        if (this.state.isDragging || this.state.isDrawingPath) return;
        if (evt.deselected.length > 0) {
            evt.deselected.forEach(this.deselectItem);
        }
    }

    onWindowResize(evt) {
        var paper = this.state.canvas;
        var w = this.state.wrapper.offsetWidth;
        var h = this.state.wrapper.offsetHeight;
        this.setState({ wrapperWidth: w, wrapperHeight: h });
        paper.setWidth(w);
        paper.setHeight(h);
        paper.renderAll();
    }

    selectItem(item, isMulti = false) {
        var paper = this.state.canvas;
        if (item != null && item.type == "group") {
            for (var key of Object.keys(item.elementProps)) {
                const elementProps = item.elementProps[key];
                const element = item.item(elementProps.index);
                element.set(elementProps.selected);
            }

            paper.requestRenderAll();

            // call back
            if (item.mxItem && this.props.onSelection && !isMulti) {
                this.props.onSelection(item.mxItem);
            }

            if (item.mxItem && this.props.onMultiSelection && isMulti) {
                this.props.onMultiSelection(item.mxItem);
            }

            const index = this.state.selectedItems.indexOf(item);
            if (index == -1) this.state.selectedItems.push(item);
        }
    }

    deSelectAllItems(isMulti = false) {

        const selectedItems = this.state.selectedItems.slice();

        selectedItems.forEach(item => {
            this.deselectItem(item, isMulti);
        });

    }

    deselectItem(item, isMulti = false) {
        var paper = this.state.canvas;
        if (item != null && item.type == "group") {
            for (var key of Object.keys(item.elementProps)) {
                const elementProps = item.elementProps[key];
                const element = item.item(elementProps.index);
                element.set(elementProps.deselected);
            }

            paper.requestRenderAll();

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
        var paper = this.state.canvas;
        if (evt.e.type.startsWith("touch")) {
            return;
        }
        if (this.state.mdp != null) {
            var deltaX = evt.e.screenX - this.state.mdp.x;
            var deltaY = evt.e.screenY - this.state.mdp.y;
            this.state.mdp.x = evt.e.screenX;
            this.state.mdp.y = evt.e.screenY;
            var delta = new fabric.Point(deltaX, deltaY);
            paper.relativePan(delta);
        }
    }
    // reset zoom to 1.0
    resetZoom() {
        var paper = this.state.canvas;
        paper.setZoom(1.0);
    }

    // reset viewport position to 0,0
    resetPosition() {
        var paper = this.state.canvas;
        paper.absolutePan(new fabric.Point(0, 0));
    }

    imageFromUrl(url, options, successCallback, errorCallback) {
        fabric.Image.fromURL(url, function(oImg) {
            successCallback(oImg);
        }, options);
    }

    imagefromUrlWrapper(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.imageFromUrl(url, options, (successResponse) => {
                resolve(successResponse);
            }, (errorResponse) => {
                reject(errorResponse);
            })
        })
    }

    async initCanvas(paper) {
        //paper.selection = false;

        // 1. Background image
        if (this.props.backgroundImageUrl) {
                const bgImage = await this.imagefromUrlWrapper(this.props.backgroundImageUrl);
                bgImage.set({
                    selectable: false,
                    evented: false,
                    originX: 'left',
                    originY: 'top',
                    left: 0,
                    top: 0
                });
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

        for (let i = 0; i < this.props.groups.length; i++) {
            const groupData = this.props.groups[i];
            let groupItems = [];
            let groupElementProps = {};
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
                    selectedProps = statusPropsCollection["selected"] || "{}";
                }

                if (groupData.elementPropsType === "inline") {
                    deselectedProps = elementData.props;
                } else {
                    deselectedProps = statusPropsCollection["deselected"] || "{}";
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
                    case "line":
                        element = new fabric.Line(elementData.coords);
                        break;
                    case "image":

                        element = await this.imagefromUrlWrapper(elementData.href, {
                            left: parseFloat(elementData.x) || 0,
                            top: parseFloat(elementData.y) || 0
                        });
                        console.debug("Element after set:", element);
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
            console.log("Group bounds:", group.getBoundingRect());
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

        // 2. Areas (behind devices)
        if (this.props.areas) {
            this.props.areas.forEach(area => {
                // Look up props from elementProps based on status (same pattern as groups)
                let statusProps = {};
                if (area.propsName && this.props.elementProps[area.propsName]) {
                    const propsCollection = this.props.elementProps[area.propsName];
                    const statusPropsCollection = propsCollection[area.status] || propsCollection["__default"] || {};
                    // Areas don't have selected/deselected states, so just use the status props directly
                    // or look for a "default" key within the status
                    statusProps = statusPropsCollection["deselected"] || statusPropsCollection;
                }
                
                const path = new fabric.Path(area.path, {
                    fill: 'transparent',
                    stroke: '#0096ff',
                    strokeWidth: 1,
                    selectable: false,
                    evented: false,
                    ...area.props,      // Inline props (fallback)
                    ...statusProps      // Status-based props (override)
                });
                path.areaId = area.id;
                paper.add(path);
            });
        }

        paper.renderAll();

        paper.upperCanvasEl.addEventListener('mousedown', (e) => {
            if (e.altKey) {
                this.state.isDragging = true;
            }
        }, true); // 'true' = capture phase, fires before Fabric

        if (!this.state.eventsInitialised) {
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
                setTimeout(() => this.onWindowResize(), 100);
            });
            
            this.setState({ eventsInitialised: true });
        }
    }

    componentDidMount() {
        var el = ReactDOM.findDOMNode(this);
        var paper = new fabric.Canvas(this.state.ids.canvasId, {
            height: el.offsetHeight,
            width: el.offsetWidth,
            backgroundColor: this.props.backgroundColor
        });

        paper.absolutePan(new fabric.Point(this.props.initialLeft, this.props.initialTop));
        paper.setZoom(this.props.initialZoom);
        this.setState({
            wrapperWidth: el.offsetWidth,
            wrapperHeight: el.offsetHeight,
            wrapper: el,
            canvas: paper
        });
        this.initCanvas(paper);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !(
            nextProps.backgroundColor == this.props.backgroundColor && _.isEqual(nextProps.groups, this.props.groups)
                && _.isEqual(nextProps.areas, this.props.areas)
        );
    }

    componentDidUpdate(prevProps) {
        const nextProps = this.props;

        const { canvas } = this.state;
        if (nextProps.backgroundColor != prevProps.backgroundColor) {
            canvas.set({ backgroundColor: nextProps.backgroundColor });
        }

        if (!_.isEqual(nextProps.groups, prevProps.groups)) {
            //canvas.clear();
            //canvas.set({ backgroundColor: nextProps.backgroundColor });
            //this.initCanvas(canvas);
        }
    }

    render() {
        return (
            <div id={this.state.ids.canvasWrapperId} className="canvasWrapper">
                <canvas id={this.state.ids.canvasId} className="canvasPaper"></canvas>
            </div>
        );
    }
}
