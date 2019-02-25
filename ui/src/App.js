import React, { Component } from 'react';
import 'element-theme-default'
//import './theme/index.css'
import './App.css';
import { ResultView } from './ResultView'
import { TableView } from './TableView'
import { TestView } from './TestView'
import { i18n } from 'element-react'
import locale from 'element-react/src/locale/lang/en'
i18n.use(locale);

class App extends Component {

  render() {
    switch(this.props.view) {
      case 'RESULT_VIEW':
        return ( <ResultView /> )
      case 'TABLE_VIEW':
        return ( <TableView /> )
      default:
        return ( <TestView /> )
    }
  }
}

export default App;
