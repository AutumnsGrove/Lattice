# Grove Loft — Ephemeral Dev Environment
# code-server (8080) + sshd (22) + firefly-agent (9090)

FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git openssh-server sudo supervisor \
    build-essential ca-certificates gnupg unzip \
    ripgrep fd-find bat jq htop tmux \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Bun
RUN curl -fsSL https://bun.sh/install | bash \
    && mv /root/.bun/bin/bun /usr/local/bin/ \
    && rm -rf /root/.bun

# code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Starship prompt
RUN curl -fsSL https://starship.rs/install.sh | sh -s -- -y

# Go (for firefly agent build)
RUN curl -fsSL https://go.dev/dl/go1.22.5.linux-amd64.tar.gz | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:${PATH}"

# Build firefly agent
COPY agent/ /tmp/agent/
RUN cd /tmp/agent && go build -o /usr/local/bin/firefly-agent . && rm -rf /tmp/agent

# Create grove user
RUN useradd -m -s /bin/bash -G sudo grove \
    && echo "grove ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/grove

# SSH setup
RUN mkdir -p /var/run/sshd \
    && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
    && echo "AllowUsers grove" >> /etc/ssh/sshd_config

# Starship config for grove user
RUN mkdir -p /home/grove/.config \
    && echo 'eval "$(starship init bash)"' >> /home/grove/.bashrc \
    && chown -R grove:grove /home/grove

# Symlink bat (Ubuntu names it batcat)
RUN ln -sf /usr/bin/batcat /usr/local/bin/bat \
    && ln -sf /usr/bin/fdfind /usr/local/bin/fd

# Supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/loft.conf

# Entrypoint
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Workspace directory
RUN mkdir -p /workspace && chown grove:grove /workspace

EXPOSE 22 8080 9090

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
