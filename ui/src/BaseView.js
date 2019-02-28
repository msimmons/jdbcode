import React, { Component } from 'react';

/**
 * A Component that deals with size changes
 */
export class BaseView extends Component {

  constructor(props) {
    super(props)
  }

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

}

