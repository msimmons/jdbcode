import React, { Component } from 'react';
import './App.css';
import { ResultView } from './ResultView'
import { TableView } from './TableView'
import { ProcedureView } from './ProcedureView'
import { TestView } from './TestView'

class App extends Component {

  render() {
    switch(this.props.view) {
      case 'RESULT_VIEW':
        return ( <ResultView /> )
      case 'TABLE_VIEW':
        return ( <TableView /> )
      case 'PROCEDURE_VIEW':
        return ( <ProcedureView /> )
      default:
        return ( <TestView /> )
    }
  }
}

export default App;
