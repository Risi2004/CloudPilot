export const getAnalysisResult = (urlStr) => {
  const url = urlStr ? urlStr.toLowerCase() : '';
  
  // 1. Next.js / React Template
  if (url.includes('next') || url.includes('react')) {
    return {
      url: urlStr,
      language: 'TypeScript / JavaScript',
      framework: 'Next.js 14 (App Router)',
      paymentGateway: 'Stripe',
      dependencies: [
        { name: 'next', version: '^14.1.0' },
        { name: 'react', version: '^18.2.0' },
        { name: '@stripe/stripe-js', version: '^3.0.1' },
        { name: 'stripe', version: '^14.16.0' },
        { name: 'lucide-react', version: '^0.331.0' },
        { name: 'tailwindcss', version: '^3.4.1' },
        { name: 'typescript', version: '^5.3.3' },
        { name: 'prisma', version: '^5.9.1' }
      ],
      buildRequirements: {
        runtimeVersion: 'Node.js v18.x or higher (LTS recommended)',
        buildCommand: 'npm run build',
        startCommand: 'npm run start',
        envVariables: [
          'DATABASE_URL (PostgreSQL connection string)',
          'NEXTAUTH_SECRET (Authentication encryption key)',
          'STRIPE_SECRET_KEY (Stripe API credentials)',
          'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (Client-side Stripe key)',
          'NEXT_PUBLIC_APP_URL (Production site origin)'
        ]
      },
      containerization: {
        baseImage: 'node:18-alpine',
        dockerfile: `FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]`,
        dockerCompose: `version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/cloudpilot
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=\${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=cloudpilot
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`
      },
      iac: {
        provider: 'AWS (Amazon Web Services)',
        architecture: 'VPC Subnets -> AWS ECS Fargate (Serverless Containers) -> AWS RDS Aurora Serverless v2 (PostgreSQL) -> Amazon CloudFront (CDN) & Route53',
        monthlyCost: [
          { item: 'ECS Fargate (0.5 vCPU, 1 GB RAM)', cost: '$11.80' },
          { item: 'RDS Aurora Serverless v2 (0.5 ACU min)', cost: '$16.20' },
          { item: 'NAT Gateway / Data Transfer', cost: '$4.50' },
          { item: 'Application Load Balancer (Shared)', cost: '$8.00' },
          { total: 'Total Estimate: $40.50 / month' }
        ],
        terraform: `provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "cloudpilot-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "aws_ecs_cluster" "main" {
  name = "cloudpilot-ecs-cluster"
}

resource "aws_ecs_task_definition" "web" {
  family                   = "nextjs-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([{
    name      = "nextjs-app"
    image     = "cloudpilot/nextjs-app:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
  }])
}`
      },
      cicd: {
        provider: 'GitHub Actions (Deploy to AWS ECS)',
        yaml: `name: Deploy to Amazon ECS

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: cloudpilot-nextjs
  ECS_SERVICE: nextjs-service
  ECS_CLUSTER: cloudpilot-ecs-cluster
  ECS_TASK_DEFINITION: task-definition.json
  CONTAINER_NAME: nextjs-app

jobs:
  deploy:
    name: Build & Push to ECR, Deploy to ECS
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: \${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: \${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT`
      },
      coreFeatures: [
        { title: 'Server-Side Rendering (SSR)', status: 'Active', desc: 'Optimized page load speed via Next.js Dynamic Routes.' },
        { title: 'Stripe Checkouts & Subscriptions', status: 'Active', desc: 'Secure webhook handlers found under /api/webhooks/stripe.' },
        { title: 'Prisma ORM integration', status: 'Active', desc: 'Connected schema model targeting PostgreSQL backend.' },
        { title: 'TailwindCSS Styling', status: 'Optimal', desc: 'Component based CSS layouts using atomic framework configurations.' },
        { title: 'Dynamic API Endpoints', status: 'Active', desc: 'Route-based functions handling login, profile, and subscription management.' }
      ]
    };
  }
  
  // 2. Python / Django Template
  if (url.includes('django') || url.includes('python')) {
    return {
      url: urlStr,
      language: 'Python 3.10+',
      framework: 'Django 5.0 (REST Framework)',
      paymentGateway: 'PayPal & Braintree',
      dependencies: [
        { name: 'django', version: '==5.0.2' },
        { name: 'djangorestframework', version: '==3.14.0' },
        { name: 'psycopg2-binary', version: '==2.9.9' },
        { name: 'braintree', version: '==4.26.0' },
        { name: 'gunicorn', version: '==21.2.0' },
        { name: 'celery', version: '==5.3.6' },
        { name: 'redis', version: '==5.0.1' },
        { name: 'django-cors-headers', version: '==4.3.1' }
      ],
      buildRequirements: {
        runtimeVersion: 'Python 3.10.x / 3.11.x',
        buildCommand: 'pip install -r requirements.txt && python manage.py collectstatic --noinput',
        startCommand: 'gunicorn myproject.wsgi:application --bind 0.0.0.0:8000',
        envVariables: [
          'DJANGO_SECRET_KEY (Production security key)',
          'DJANGO_DEBUG (Set to False in production)',
          'DATABASE_URL (PostgreSQL database endpoint)',
          'BRAINTREE_MERCHANT_ID (Braintree credentials)',
          'BRAINTREE_PUBLIC_KEY (Braintree credentials)',
          'BRAINTREE_PRIVATE_KEY (Braintree credentials)',
          'REDIS_URL (Celery task queue server URL)'
        ]
      },
      containerization: {
        baseImage: 'python:3.10-slim',
        dockerfile: `FROM python:3.10-slim

# System requirements for psycopg2 and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

# Port exposure
EXPOSE 8000

# Execute server bootstrapper
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "myproject.wsgi:application"]`,
        dockerCompose: `version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DJANGO_DEBUG=True
      - DATABASE_URL=postgres://postgres:postgres@db:5432/django_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=django_db
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: .
    command: celery -A myproject worker --loglevel=info
    environment:
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis

volumes:
  pgdata:`
      },
      iac: {
        provider: 'AWS (Amazon Web Services)',
        architecture: 'AWS Elastic Beanstalk (Docker Platform) -> AWS RDS PostgreSQL -> Amazon ElastiCache (Redis for Background Tasks) -> AWS S3 (Static assets hosting)',
        monthlyCost: [
          { item: 'Elastic Beanstalk / ECS instances (t3.micro)', cost: '$15.20' },
          { item: 'RDS Single-AZ t4g.micro Database', cost: '$13.50' },
          { item: 'ElastiCache Redis Serverless Instance', cost: '$8.20' },
          { item: 'S3 & CloudFront Asset storage', cost: '$3.50' },
          { total: 'Total Estimate: $40.40 / month' }
        ],
        terraform: `provider "aws" {
  region = "us-west-2"
}

resource "aws_db_instance" "default" {
  allocated_storage    = 20
  db_name              = "django_db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t4g.micro"
  username             = "dbmaster"
  password             = "supersecurepassword123"
  skip_final_snapshot  = true
}

resource "aws_elastic_beanstalk_application" "app" {
  name        = "django-backend"
  description = "Django Web Application"
}

resource "aws_elastic_beanstalk_environment" "env" {
  name                = "django-production"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.1.0 running Docker"

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DATABASE_URL"
    value     = "postgres://dbmaster:supersecurepassword123@\${aws_db_instance.default.endpoint}/django_db"
  }
}`
      },
      cicd: {
        provider: 'GitHub Actions (Django CI/CD with EB deploy)',
        yaml: `name: Django CI & Deploy

on:
  push:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python 3.10
      uses: actions/setup-python@v5
      with:
        python-version: '3.10'
    - name: Install Dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    - name: Run Tests
      run: |
        python manage.py test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Generate Deployment Package
      run: zip -r deploy.zip . -x "*.git*"
    - name: Deploy to Elastic Beanstalk
      uses: einaregilsson/beanstalk-deploy@v22
      with:
        aws_access_key: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws_secret_key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        application_name: django-backend
        environment_name: django-production
        version_label: \${{ github.sha }}
        region: us-west-2
        deployment_package: deploy.zip`
      },
      coreFeatures: [
        { title: 'Django REST API endpoints', status: 'Active', desc: 'Secure endpoints automatically serving JSON serialized data models.' },
        { title: 'Braintree Gateway Integration', status: 'Active', desc: 'Braintree payment token validation, custom drop-in integration.' },
        { title: 'Asynchronous Celery Workers', status: 'Active', desc: 'Tasks configured to run in the background (emails, reports generator).' },
        { title: 'Secure Admin Console', status: 'Active', desc: 'Internal control panel enabled at root /admin URL namespace.' }
      ]
    };
  }

  // 3. Java / Spring Boot Template
  if (url.includes('spring') || url.includes('java') || url.includes('boot')) {
    return {
      url: urlStr,
      language: 'Java 17 (JDK)',
      framework: 'Spring Boot 3.2.x',
      paymentGateway: 'Razorpay',
      dependencies: [
        { name: 'spring-boot-starter-web', version: '3.2.3' },
        { name: 'spring-boot-starter-data-jpa', version: '3.2.3' },
        { name: 'spring-boot-starter-security', version: '3.2.3' },
        { name: 'razorpay-java', version: '1.4.3' },
        { name: 'postgresql', version: '42.6.0' },
        { name: 'lombok', version: '1.18.30' },
        { name: 'spring-boot-starter-validation', version: '3.2.3' }
      ],
      buildRequirements: {
        runtimeVersion: 'Java JDK 17 (Eclipse Temurin or OpenJDK)',
        buildCommand: './mvnw clean package -DskipTests',
        startCommand: 'java -jar target/my-app-0.0.1-SNAPSHOT.jar',
        envVariables: [
          'SPRING_PROFILES_ACTIVE (Set to prod in production)',
          'SPRING_DATASOURCE_URL (PostgreSQL JDBC connection endpoint)',
          'SPRING_DATASOURCE_USERNAME (DB Username)',
          'SPRING_DATASOURCE_PASSWORD (DB Password)',
          'RAZORPAY_KEY_ID (Razorpay credentials)',
          'RAZORPAY_KEY_SECRET (Razorpay API Secret)'
        ]
      },
      containerization: {
        baseImage: 'eclipse-temurin:17-jdk-alpine',
        dockerfile: `FROM maven:3.8.5-openjdk-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
ENV PORT 8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]`,
        dockerCompose: `version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/springboot_db
      - SPRING_DATASOURCE_USERNAME=springboot_user
      - SPRING_DATASOURCE_PASSWORD=springboot_pwd
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=springboot_user
      - POSTGRES_PASSWORD=springboot_pwd
      - POSTGRES_DB=springboot_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`
      },
      iac: {
        provider: 'AWS (Amazon Web Services)',
        architecture: 'AWS ECS Fargate Cluster -> AWS RDS PostgreSQL DB -> Amazon ElastiCache (Redis) -> CloudWatch Logs',
        monthlyCost: [
          { item: 'ECS Fargate (1 vCPU, 2 GB RAM)', cost: '$23.60' },
          { item: 'RDS Single-AZ db.t4g.small (PostgreSQL)', cost: '$25.00' },
          { item: 'Networking & Application Load Balancer', cost: '$12.00' },
          { total: 'Total Estimate: $60.60 / month' }
        ],
        terraform: `provider "aws" {
  region = "eu-west-1"
}

resource "aws_security_group" "db_sg" {
  name        = "springboot-db-sg"
  description = "Allow DB connection"
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

resource "aws_db_instance" "postgres" {
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t4g.small"
  allocated_storage      = 30
  db_name                = "springboot_db"
  username               = "springboot_user"
  password               = "springboot_password"
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true
}`
      },
      cicd: {
        provider: 'GitHub Actions (Java CI/CD Maven)',
        yaml: `name: Java CI with Maven

on:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: maven
    - name: Build with Maven
      run: mvn -B package --file pom.xml`
      },
      coreFeatures: [
        { title: 'Spring Boot REST Controller API', status: 'Active', desc: 'Secure APIs with request validation and customized response handlers.' },
        { title: 'Razorpay Payment API integration', status: 'Active', desc: 'Razorpay Order Generation & verification endpoints configured in PaymentController.' },
        { title: 'Spring Security & JWT OAuth2', status: 'Active', desc: 'Configured filter chain checking authorization headers.' },
        { title: 'Hibernate JPA Entities', status: 'Active', desc: 'Schema modeling mapped to relational PostgreSQL database.' }
      ]
    };
  }

  // 4. Default / Generic Express.js template
  return {
    url: urlStr,
    language: 'JavaScript / Node.js',
    framework: 'Express.js (Node Backend)',
    paymentGateway: 'Stripe',
    dependencies: [
      { name: 'express', version: '^4.18.2' },
      { name: 'cors', version: '^2.8.5' },
      { name: 'dotenv', version: '^16.4.5' },
      { name: 'stripe', version: '^14.19.0' },
      { name: 'pg', version: '^8.11.3' },
      { name: 'jsonwebtoken', version: '^9.0.2' },
      { name: 'morgan', version: '^1.10.0' }
    ],
    buildRequirements: {
      runtimeVersion: 'Node.js v18.x or v20.x',
      buildCommand: 'npm install',
      startCommand: 'node src/index.js',
      envVariables: [
        'PORT (defaults to 5000)',
        'DATABASE_URL (PostgreSQL link)',
        'JWT_SECRET (Session verification token)',
        'STRIPE_SECRET_KEY (Stripe payment gateway credential)'
      ]
    },
    containerization: {
      baseImage: 'node:18-alpine',
      dockerfile: `FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD [ "node", "src/index.js" ]`,
      dockerCompose: `version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - DATABASE_URL=postgres://postgres:postgres@db:5432/api_db
      - STRIPE_SECRET_KEY=\${STRIPE_SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=api_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`
    },
    iac: {
      provider: 'AWS (Amazon Web Services)',
      architecture: 'AWS ECS Fargate -> AWS RDS PostgreSQL DB -> Amazon Application Load Balancer -> Amazon Route53 DNS',
      monthlyCost: [
        { item: 'ECS Fargate App Runner Instance', cost: '$11.80' },
        { item: 'RDS PostgreSQL db.t4g.micro DB instance', cost: '$13.50' },
        { item: 'Application Load Balancer / NAT Server', cost: '$11.00' },
        { total: 'Total Estimate: $36.30 / month' }
      ],
      terraform: `provider "aws" {
  region = "us-east-1"
}

resource "aws_db_instance" "db" {
  allocated_storage    = 10
  db_name              = "api_db"
  engine               = "postgres"
  instance_class       = "db.t4g.micro"
  username             = "postgres"
  password             = "supersecret123"
  skip_final_snapshot  = true
}

resource "aws_apprunner_service" "api_server" {
  service_name = "express-api"

  source_configuration {
    image_repository {
      image_identifier      = "public.ecr.aws/cloudpilot/express-api:latest"
      image_repository_type = "ECR"
    }
    auto_deployments_enabled = true
  }
}`
    },
    cicd: {
      provider: 'GitHub Actions (Deploy to AWS)',
      yaml: `name: Node.js CI

on:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm test --if-present`
    },
    coreFeatures: [
      { title: 'Express Router API Endpoint Middleware', status: 'Active', desc: 'Organized routes with CORS, JSON body parser, and logging hooks.' },
      { title: 'Stripe API Session Checkout Router', status: 'Active', desc: 'Payment redirection triggers, subscription charge validators.' },
      { title: 'PostgreSQL Connection Client', status: 'Active', desc: 'Direct connection pool query executors targeting client schema.' },
      { title: 'JSON Web Token Authenticator', status: 'Active', desc: 'Authentication headers verifiers protecting API endpoints.' }
    ]
  };
};
