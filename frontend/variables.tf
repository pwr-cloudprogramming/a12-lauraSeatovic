variable "vpc_id" {
  description = "ID of the VPC where the Elastic Beanstalk environment will be deployed"
  default = "vpc-01dca074ef1c3c80b"
}

variable "subnet" {
    description = "Subnet ID of first zone"
    default = ["subnet-0f0611332cfd73a53" , "subnet-0bee8e09ac0089efc"]
}
