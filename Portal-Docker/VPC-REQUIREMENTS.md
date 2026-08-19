# VPC & Hosting Requirements — CSI St. Mark's Portal (Portal-Docker)

Comprehensive infrastructure, VPC, network security, compute, and storage requirements for deploying `csistmarkscmsportal` in a cloud Virtual Private Cloud (AWS, Azure, GCP, DigitalOcean, or private cloud / VPS).

---

## 1. System & Compute Specifications

The Portal container packages three internal services: **NestJS API** (port 4000), **Next.js Standalone CMS** (port 3001), and a bundled **MongoDB 8.0 instance with WiredTiger engine** (port 27017, cache capped at 256 MB).

| Parameter | Minimum Requirement | Recommended (Production) |
| :--- | :--- | :--- |
| **Instance Type** | AWS `t3.small` / `t4g.small`, Azure `B2s`, GCP `e2-small` | AWS `t3.medium`, Azure `B2ms`, GCP `e2-medium` |
| **vCPU** | **1 vCPU** *(Mandatory: x86-64 with AVX instruction support, or arm64)* | **2 vCPUs** |
| **Memory (RAM)** | **1 GB** (dedicated to container; requires swap enabled on 1GB hosts) | **2 GB – 4 GB** |
| **Storage Disk** | **15 GB – 20 GB** Persistent SSD / EBS volume | **40 GB+** Persistent SSD |
| **Host OS** | Ubuntu 22.04 / 24.04 LTS, Debian 12, or AlmaLinux 9 | Ubuntu 24.04 LTS |
| **Runtime** | Docker Engine 24.0+ & Docker Compose v2 | Docker Engine Latest & Compose v2 |

> **Important CPU Requirement**: If using x86-64 virtualization, verify hypervisor AVX pass-through:
> ```bash
> grep -o avx /proc/cpuinfo | head -1   # Must return "avx"
> ```

---

## 2. VPC & Subnet Architecture

### Option A: Single Public Subnet (Standalone / All-in-One Image)
* **VPC CIDR**: e.g., `10.0.0.0/16`
* **Subnet**: 1 Public Subnet (`10.0.1.0/24`) attached to an **Internet Gateway (IGW)**.
* **Public IP**: Elastic IP (AWS EIP) or Cloud Public IPv4 assigned to the instance or Load Balancer.

### Option B: Multi-Tier VPC (Production with External MongoDB / Reverse Proxy)
* **Public Subnet (`10.0.1.0/24`)**: Reverse Proxy / Application Load Balancer (ALB, Nginx, or Traefik) terminating TLS.
* **Private Application Subnet (`10.0.2.0/24`)**: Portal Docker Host (reaches internet via NAT Gateway for image pulls/updates).
* **Private Database Subnet (`10.0.3.0/24`)**: Optional external MongoDB cluster (e.g., MongoDB Atlas VPC Peering / PrivateLink).

---

## 3. Firewall & Security Group Rules

### Inbound Rules (Ingress)

| Port | Protocol | Source | Purpose / Description |
| :--- | :--- | :--- | :--- |
| **8080** | TCP | `0.0.0.0/0` (or Load Balancer SG) | Direct application access (API + CMS) |
| **80** | TCP | `0.0.0.0/0` | HTTP traffic / ACME Let's Encrypt challenge (if using reverse proxy) |
| **443** | TCP | `0.0.0.0/0` | HTTPS secure web traffic |
| **22** | TCP | `Admin IP / Bastion CIDR` | SSH server management |
| **27017** | TCP | **Deny All / No Public Ingress** | Internal MongoDB port (must stay isolated) |

### Outbound Rules (Egress)

| Port | Protocol | Destination | Purpose |
| :--- | :--- | :--- | :--- |
| **443** | TCP | `0.0.0.0/0` | Docker Hub registry authentication, image pulls, OS updates |
| **53** | UDP / TCP | VPC DNS Resolver | DNS name resolution |
| **80 / 443** | TCP | Website Origin | Outbound calls to `WEBSITE_REVALIDATE_URL` when publishing CMS items |

---

## 4. Reverse Proxy & TLS Requirements

If placing Nginx, Caddy, Cloudflare, or an AWS Application Load Balancer in front of port 8080:

1. **Header Forwarding (Mandatory)**:
   * `X-Forwarded-Proto: https`
   * `X-Forwarded-Host: <your-domain>`
   *(The container relies on these headers to generate proper absolute media URLs without HTTPS/mixed-content errors).*
2. **Client Body Size**:
   * Minimum `client_max_body_size 200M;` (to permit video and high-resolution photo uploads).
3. **Proxy Timeout**:
   * Read timeout `≥ 120s` (to allow first-boot database restore without proxy 504 gateway timeout).

---

## 5. Storage & Persistence Volumes

Two persistent host volumes must be mounted to prevent data loss across container restarts:

| Container Path | Purpose | Minimum Volume Size |
| :--- | :--- | :--- |
| `/data` | MongoDB files, snapshot metadata, auto-generated JWT secrets | 5 GB SSD |
| `/app/backend/uploads` | Uploaded images, audio, video files | 10 GB – 50 GB+ SSD / EFS / Block Storage |

---

## 6. Environment Configuration

Define these environment variables in your deployment setup or `.env` file:

```env
PORT=8080
PUBLIC_URL=https://portal.yourdomain.org
CORS_ORIGINS=https://yourdomain.org,https://www.yourdomain.org
JWT_ACCESS_SECRET=<generate-with-openssl-rand-base64-48>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-48>
WEBSITE_REVALIDATE_URL=https://yourdomain.org/api/revalidate
WEBSITE_REVALIDATE_SECRET=<shared-secret-with-public-website>
```

---

## 7. Post-Deployment Verification

Run the verification suite once the container is running inside your VPC:

```bash
# 1. Basic Healthcheck
curl -s http://127.0.0.1:8080/v1/health

# 2. Run the 53-point contract test
docker exec portal node /app/check-website-api.mjs http://127.0.0.1:8080
```
