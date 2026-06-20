import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import CostBreakdown from '../../components/CostEstimation/CostBreakdown';
import PlatformComparison from '../../components/CostEstimation/PlatformComparison';
import AlternativeOptions from '../../components/CostEstimation/AlternativeOptions';
import './CostEstimation.css';

function CostEstimation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [costData, setCostData] = useState(null);

  useEffect(() => {
    if (repoUrl) {
      const url = repoUrl.toLowerCase();
      
      // Determine framework and cost models
      if (url.includes('next') || url.includes('react')) {
        setCostData({
          provider: 'AWS (Amazon Web Services)',
          totalCost: '$40.50',
          costItems: [
            { item: 'ECS Fargate Containers (0.5 vCPU, 1 GB RAM)', cost: '$11.80' },
            { item: 'RDS Aurora Serverless v2 DB (0.5 ACU min)', cost: '$16.20' },
            { item: 'NAT Gateway & Data Egress Transfer', cost: '$4.50' },
            { item: 'Application Load Balancer (ALB Shared)', cost: '$8.00' }
          ],
          comparisons: [
            {
              name: 'AWS (Fargate + RDS)',
              cost: '$40.50',
              description: 'Standard enterprise setup with fully isolated VPC containerized microservices.',
              deploymentModel: 'ECS Fargate & RDS',
              setupOverhead: 'High (Terraform/IaC)',
              scalability: 'Unlimited',
              advantage: 'Enterprise grade SLA, dynamic auto-scaling, high security.',
              isRecommended: true
            },
            {
              name: 'Railway PaaS',
              cost: '$26.00',
              description: 'Developer-first platform-as-a-service providing fast deployments and simple networking.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Low (Git-push)',
              scalability: 'Medium-High',
              advantage: 'Zero config networking, fast previews, direct GitHub sync.'
            },
            {
              name: 'Render PaaS',
              cost: '$22.00',
              description: 'Affordable platform-as-a-service suitable for static frontends and backing databases.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Very Low (Git-push)',
              scalability: 'Medium',
              advantage: 'Static sites are free, PostgreSQL has zero config.'
            }
          ],
          alternatives: [
            {
              title: 'Offload Frontend to Vercel/Netlify',
              savings: '$11.80/mo',
              description: 'Deploy Next.js pages to global edge networks for free. Only deploy the backend/database in Fargate.'
            },
            {
              title: 'Aurora Database Auto-Pause',
              savings: '$8.10/mo',
              description: 'Configure Aurora Serverless v2 database to scale down to 0 capacity units during inactive night hours.'
            },
            {
              title: 'Bypass NAT Gateways in Dev',
              savings: '$4.50/mo',
              description: 'Use public subnets with secure security groups for staging to bypass AWS NAT gateway costs.'
            }
          ]
        });
      } else if (url.includes('django') || url.includes('python')) {
        setCostData({
          provider: 'AWS (Amazon Web Services)',
          totalCost: '$40.40',
          costItems: [
            { item: 'Elastic Beanstalk Compute (t3.micro VM)', cost: '$15.20' },
            { item: 'RDS Single-AZ DB (PostgreSQL Engine)', cost: '$13.50' },
            { item: 'ElastiCache (Redis serverless instance)', cost: '$8.20' },
            { item: 'S3 & CloudFront (Static Asset hosting)', cost: '$3.50' }
          ],
          comparisons: [
            {
              name: 'AWS (Elastic Beanstalk)',
              cost: '$40.40',
              description: 'Managed VM application launcher utilizing standard relational databases and S3.',
              deploymentModel: 'Elastic Beanstalk VM',
              setupOverhead: 'Medium',
              scalability: 'High',
              advantage: 'Direct system configuration access, persistent state, S3 speeds.',
              isRecommended: true
            },
            {
              name: 'Railway PaaS',
              cost: '$25.50',
              description: 'Effortless worker queues and Redis instance configurations pre-linked.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Low (Git-push)',
              scalability: 'Medium-High',
              advantage: 'Provision Celery Redis workers in a single click.'
            },
            {
              name: 'Render PaaS',
              cost: '$23.00',
              description: 'Simple web services and Celery background workers with automatic healthchecks.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Low (Git-push)',
              scalability: 'Medium',
              advantage: 'Cheaper Managed Postgres databases.'
            }
          ],
          alternatives: [
            {
              title: 'SQLite Database for Dev',
              savings: '$13.50/mo',
              description: 'Replace managed RDS database with internal container sqlite file for early preview/staging environments.'
            },
            {
              title: 'Single EC2 Node deployment',
              savings: '$8.20/mo',
              description: 'Deploy Django and Celery redis broker on a single VM rather than using isolated multi-resource services.'
            }
          ]
        });
      } else if (url.includes('spring') || url.includes('java') || url.includes('boot')) {
        setCostData({
          provider: 'AWS (Amazon Web Services)',
          totalCost: '$60.60',
          costItems: [
            { item: 'ECS Fargate Containers (1 vCPU, 2 GB RAM)', cost: '$23.60' },
            { item: 'RDS Single-AZ (db.t4g.small DB Engine)', cost: '$25.00' },
            { item: 'Network Load Balancing & VPC Routing', cost: '$12.00' }
          ],
          comparisons: [
            {
              name: 'AWS (ECS Fargate)',
              cost: '$60.60',
              description: 'Premium serverless containerization with dedicated RAM allocation for Spring JVM.',
              deploymentModel: 'ECS Fargate',
              setupOverhead: 'High',
              scalability: 'Unlimited',
              advantage: 'Dedicated memory reservations prevent JVM out-of-memory crashes.',
              isRecommended: true
            },
            {
              name: 'Railway PaaS',
              cost: '$42.00',
              description: 'Simple hosting but requires monitoring memory usage strictly on JVM starts.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Low (Git-push)',
              scalability: 'Medium',
              advantage: 'Super fast cold starts, elastic billing based on real usage.'
            },
            {
              name: 'Render PaaS',
              cost: '$39.00',
              description: 'Supports Java builds easily. Recommended to purchase RAM-boosted web plans.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Very Low',
              scalability: 'Medium',
              advantage: 'Simple dashboard control, transparent tier upgrades.'
            }
          ],
          alternatives: [
            {
              title: 'Downsize JVM RAM Allocation',
              savings: '$11.80/mo',
              description: 'Tune Garbage Collector (ZGC) parameters to run Spring Boot inside 1 GB RAM containers safely.'
            },
            {
              title: 'AWS Database Scheduler',
              savings: '$12.50/mo',
              description: 'Automatically shut down databases at 8 PM and reboot at 8 AM daily, cutting billing time by 50%.'
            }
          ]
        });
      } else {
        // Express / Node.js
        setCostData({
          provider: 'AWS (Amazon Web Services)',
          totalCost: '$36.30',
          costItems: [
            { item: 'App Runner Compute Instance (0.5 vCPU, 1 GB RAM)', cost: '$11.80' },
            { item: 'RDS db.t4g.micro Database Engine', cost: '$13.50' },
            { item: 'NAT Gateway Network Traffic & Ingress/Egress', cost: '$11.00' }
          ],
          comparisons: [
            {
              name: 'AWS (App Runner)',
              cost: '$36.30',
              description: 'Fully managed containers with automatic HTTPS, direct security group links to RDS.',
              deploymentModel: 'AWS App Runner',
              setupOverhead: 'Low-Medium',
              scalability: 'High',
              advantage: 'Integrated load balancing and TLS certificate management.',
              isRecommended: true
            },
            {
              name: 'Railway PaaS',
              cost: '$24.00',
              description: 'Perfect for light Node.js apps. Extremely fast setup.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Very Low',
              scalability: 'Medium',
              advantage: 'Pay-per-minute billing, shared memory usage metrics.'
            },
            {
              name: 'Render PaaS',
              cost: '$22.00',
              description: 'Reliable Node.js runtime environment with zero overhead.',
              deploymentModel: 'PaaS Containers',
              setupOverhead: 'Very Low',
              scalability: 'Medium',
              advantage: 'Automatic port discovery and environment variable injector.'
            }
          ],
          alternatives: [
            {
              title: 'Dockerize Postgres into Compute Node',
              savings: '$13.50/mo',
              description: 'Run Express.js and Postgres database in the same container using Docker Compose for small web apps.'
            },
            {
              title: 'Add Cloudflare Edge Caching',
              savings: '$3.00/mo',
              description: 'Cache static response API payloads on Cloudflare network to limit AWS egress network costs.'
            }
          ]
        });
      }
    } else {
      setCostData(null);
    }
  }, [repoUrl]);

  return (
    <DashboardLayout>
      <div className="cost-page-wrapper">
        {repoUrl ? (
          costData && (
            <div className="cost-content-container">
              {/* Back Button */}
              <button 
                type="button" 
                className="cost-back-btn" 
                onClick={() => navigate(`/architecture-recommendation?url=${encodeURIComponent(repoUrl)}`)}
              >
                ← Back to Architecture Recommendations
              </button>

              <div className="cost-header-section">
                <h1 className="cost-header-title">Cost Estimation Report</h1>
                <p className="cost-header-desc font-mono">
                  <span className="cost-repo-label">TARGET REPO:</span>
                  <span className="cost-repo-val" title={repoUrl}>{repoUrl}</span>
                </p>
              </div>

              <div className="cost-top-row">
                <CostBreakdown 
                  provider={costData.provider} 
                  costItems={costData.costItems} 
                  totalCost={costData.totalCost} 
                />

                <AlternativeOptions 
                  alternatives={costData.alternatives} 
                />
              </div>

              <div className="cost-bottom-row">
                <PlatformComparison 
                  comparisons={costData.comparisons} 
                />
              </div>
            </div>
          )
        ) : (
          <div className="cost-empty-container">
            <div className="cost-empty-card">
              <h2 className="cost-empty-title">Deployment Cost Estimations</h2>
              <p className="cost-empty-desc">No repository URL selected. Please scan repository and confirm architecture recommendation first.</p>
              <button 
                type="button" 
                className="cost-go-back-btn" 
                onClick={() => navigate('/repositories')}
              >
                Go to Repository Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default CostEstimation;
