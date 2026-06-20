import React, { useState } from 'react';
import terraformIcon from '../../assets/terraform.svg';
import copyIcon from '../../assets/copy.svg';
import downloadIcon from '../../assets/download.svg';

function TerraformPanel() {
  const [activeFile, setActiveFile] = useState('main.tf');

  const mainTfCode = [
    { num: 1, content: <><span className="ws-kw">resource</span> <span className="ws-str">"aws_ecs_cluster"</span> <span className="ws-str">"main"</span> {'{'}</> },
    { num: 2, content: <>  <span className="ws-prop">name</span> = <span className="ws-str">"foodloop-cluster"</span></> },
    { num: 3, content: <>{'  '}</> },
    { num: 4, content: <>  <span className="ws-prop">setting</span> {'{'}</> },
    { num: 5, content: <>    <span className="ws-prop">name</span>  = <span className="ws-str">"containerInsights"</span></> },
    { num: 6, content: <>    <span className="ws-prop">value</span> = <span className="ws-str">"enabled"</span></> },
    { num: 7, content: <>  {'}'}</> },
    { num: 8, content: <>{'}'}</> },
    { num: 9, content: <>{'  '}</> },
    { num: 10, content: <><span className="ws-kw">resource</span> <span className="ws-str">"aws_apprunner_service"</span> <span className="ws-str">"frontend"</span> {'{'}</> },
    { num: 11, content: <>  <span className="ws-prop">service_name</span> = <span className="ws-str">"foodloop-frontend"</span></> },
    { num: 12, content: <>{'  '}</> },
    { num: 13, content: <>  <span className="ws-prop">source_configuration</span> {'{'}</> },
    { num: 14, content: <>    <span className="ws-prop">auto_deployments_enabled</span> = <span className="ws-kw">true</span></> },
    { num: 15, content: <>  {'}'}</> },
    { num: 16, content: <>{'}'}</> }
  ];

  const variablesTfCode = [
    { num: 1, content: <><span className="ws-kw">variable</span> <span className="ws-str">"aws_region"</span> {'{'}</> },
    { num: 2, content: <>  <span className="ws-prop">type</span>        = <span className="ws-kw">string</span></> },
    { num: 3, content: <>  <span className="ws-prop">default</span>     = <span className="ws-str">"us-east-1"</span></> },
    { num: 4, content: <>  <span className="ws-prop">description</span> = <span className="ws-str">"The target AWS deployment region"</span></> },
    { num: 5, content: <>{'}'}</> }
  ];

  const getCodeLines = () => {
    return activeFile === 'main.tf' ? mainTfCode : variablesTfCode;
  };

  return (
    <section className="ws-terraform-panel">
      <div className="ws-terraform-header">
        <div className="ws-terraform-title-row">
          <img src={terraformIcon} alt="" className="ws-terraform-icon" style={{ width: 20, height: 12, marginRight: 8 }} />
          <h2 className="ws-terraform-title">Terraform</h2>
          <span className="ws-version-badge">v1.5.0</span>
        </div>
        <div className="ws-terraform-actions">
          <button type="button" className="ws-icon-btn" aria-label="Copy code">
            <img src={copyIcon} alt="Copy" style={{ width: 16, height: 16 }} />
          </button>
          <button type="button" className="ws-icon-btn" aria-label="Download code">
            <img src={downloadIcon} alt="Download" style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      <div className="ws-file-tabs">
        <button
          type="button"
          className={`ws-file-tab ${activeFile === 'main.tf' ? 'active' : ''}`}
          onClick={() => setActiveFile('main.tf')}
        >
          main.tf
        </button>
        <button
          type="button"
          className={`ws-file-tab ${activeFile === 'variables.tf' ? 'active' : ''}`}
          onClick={() => setActiveFile('variables.tf')}
        >
          variables.tf
        </button>
      </div>

      <div className="ws-code-editor">
        <pre className="ws-code-block">
          <code>
            {getCodeLines().map((line) => (
              <div key={line.num} className="ws-line">
                <span className="ws-line-num">{line.num}</span>
                <span className="ws-line-content">{line.content}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </section>
  );
}

export default TerraformPanel;
