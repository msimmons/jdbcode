import React, { Component } from 'react';

/**
 * A Component that deals with size changes
 */
export class BaseView extends Component {

  componentWillMount() {
    this.updateDimensions()
  }
  
  componentDidMount() {
    window.addEventListener("resize", this.updateDimensions)
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.updateDimensions)
  }

  updateDimensions = () => {
    var height = window.innerHeight - 50
    this.setState({...this.state, maxHeight: height})
  }

  /**
   * These renders take care of ensuring that overflow is triggered
   */
  renderHeader = (column) => {
    return (<span style={{whiteSpace: "nowrap"}}>{column.label}</span>)
  }

  /**
   * These renders take care of ensuring that overflow is triggered
   */
  renderCell = (row, column, ndx) => {
    return (<span style={{whiteSpace: "nowrap"}}>{row[column.prop]}</span>)
  }
}

