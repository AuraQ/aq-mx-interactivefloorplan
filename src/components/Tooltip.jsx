import React, { Component, createElement, useState } from "react";

export function Tooltip(props) {
    const tooltipStyle = {
        display: "block",
        left: props.left,
        top: props.top
    };

    return (
        <div className="canvasTooltip" style={tooltipStyle}>
            {props.children}
        </div>
    );
}
