FROM alpine:3.19

RUN apk update && apk add --no-cache \
    openssh \
    bash \
    curl \
    sudo \
    shadow

# Configure lab SSH user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:LabPassword2026!" | chpasswd && \
    echo "labuser ALL=(ALL) ALL" >> /etc/sudoers

RUN ssh-keygen -A && \
    echo "PermitRootLogin no" >> /etc/ssh/sshd_config && \
    echo "PasswordAuthentication no" >> /etc/ssh/sshd_config # Note: For a real secure environment, use SSH keys only.

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
