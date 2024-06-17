provider "aws" {
  region = "us-east-1"
}

resource "aws_dynamodb_table" "tic_tac_toe_scores" {
  name           = "TicTacToeScores"
  billing_mode   = "PROVISIONED"

  hash_key       = "playerId"
  range_key      = "gameId"

  read_capacity  = 1
  write_capacity = 1

  attribute {
    name = "playerId"
    type = "S"
  }

  attribute {
    name = "gameId"
    type = "S"
  }

  attribute {
    name = "score"
    type = "N"
  }

  global_secondary_index {
    name               = "ScoreIndex"
    hash_key           = "score"
    projection_type    = "ALL"
    read_capacity      = 1
    write_capacity     = 1
  }

  tags = {
    Name = "TicTacToeScores"
  }
}


resource "aws_api_gateway_rest_api" "my_api" {
  name        = "my-api"
  description = "My API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_resource" "root" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  parent_id   = aws_api_gateway_rest_api.my_api.root_resource_id
  path_part   = "mypath"
}

resource "aws_api_gateway_method" "post_method" {
  rest_api_id   = aws_api_gateway_rest_api.my_api.id
  resource_id   = aws_api_gateway_resource.root.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Content-Type" = false
  }
}

resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.my_api.id
  resource_id             = aws_api_gateway_resource.root.id
  http_method             = aws_api_gateway_method.post_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.python_lambda.invoke_arn

  request_templates = {
    "application/json" = <<EOF
{
  "body": $input.json('$')
}
EOF
  }
}

resource "aws_api_gateway_method_response" "post_response_200" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  resource_id = aws_api_gateway_resource.root.id
  http_method = aws_api_gateway_method.post_method.http_method
  status_code = "200"
}

resource "aws_api_gateway_integration_response" "post_integration_response_200" {
  rest_api_id = aws_api_gateway_rest_api.my_api.id
  resource_id = aws_api_gateway_resource.root.id
  http_method = aws_api_gateway_method.post_method.http_method
  status_code = aws_api_gateway_method_response.post_response_200.status_code

  response_templates = {
    "application/json" = ""
  }

  depends_on = [
    aws_api_gateway_integration.lambda_integration
  ]
}

resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.lambda_integration,
    aws_api_gateway_method_response.post_response_200,
    aws_api_gateway_integration_response.post_integration_response_200
  ]

  rest_api_id = aws_api_gateway_rest_api.my_api.id
  stage_name  = "dev"
}


data "archive_file" "lambda_package" {
  type        = "zip"
  source_file = "${path.module}/lambda_function.zip"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "python_lambda" {
  filename         = data.archive_file.lambda_package.output_path
  function_name    = "myLambdaFunction"
  role             = data.aws_iam_role.existing_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.8"
  source_code_hash = data.archive_file.lambda_package.output_base64sha256
}

data "aws_iam_role" "existing_role" {
  name = "LabRole"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.python_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.my_api.execution_arn}/*/*"
}