provider "aws" {
  region = "us-east-1"
}

data "aws_iam_role" "existing_role" {
  name = "LabRole"
}

data "aws_iam_instance_profile" "existing_instance_profile" {
  name = "LabInstanceProfile"
}

resource "aws_security_group" "allow_ssh_http" {
  name_prefix = "allow_ssh_http"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

ingress {
    from_port   = 8081
    to_port     = 8081
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "tic_tac_toe" {
  ami           = "ami-006dcf34c09e50022" // Amazon Linux 2 AMI
  instance_type = "t2.micro"
  key_name      = "vockey"
  vpc_security_group_ids = [
    aws_security_group.allow_ssh_http.id,
  ]
  user_data = <<-EOF
              #!/bin/bash

              sudo yum install -y docker git python3
              sudo systemctl enable docker
              sudo systemctl start docker
              sudo chown $USER /var/run/docker.sock
              sudo curl -L https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
              sudo chmod +x /usr/local/bin/docker-compose
              sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
              git clone https://github.com/pwr-cloudprogramming/a10-lauraSeatovic.git
              cd a10-lauraSeatovic
              PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
              echo $PUBLIC_IP > ip.txt
              echo "PUBLIC_IP=$PUBLIC_IP" > .env
              sudo docker-compose up -d

              EOF



  tags = {
    Name = "Tic-Tac-Toe"
    }


}

resource "random_id" "bucket_id" {
  byte_length = 8
}

resource "aws_s3_bucket" "images_bucket" {
  bucket = "images-${random_id.bucket_id.hex}"
  acl    = "private" 
}

output "public_ip" {
  value = aws_instance.tic_tac_toe.public_ip
}