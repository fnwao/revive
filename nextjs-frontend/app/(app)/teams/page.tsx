"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Plus, UserPlus, Crown, Shield, UserCheck, User } from "lucide-react"
import { getTeams, createTeam, getTeamMembers, addTeamMember, type Team, type TeamMember } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const { toast } = useToast()

  const loadTeams = async () => {
    try {
      setLoading(true)
      const response = await getTeams()
      setTeams(response.teams)
    } catch (error) {
      console.error("Error loading teams:", error)
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    try {
      const members = await getTeamMembers(teamId)
      setTeamMembers(members)
    } catch (error) {
      console.error("Error loading team members:", error)
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "error",
      })
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id)
    }
  }, [selectedTeam])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />
      case "manager":
        return <UserCheck className="h-4 w-4 text-green-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-yellow-100 text-yellow-800",
      admin: "bg-blue-100 text-blue-800",
      manager: "bg-green-100 text-green-800",
      member: "bg-gray-100 text-gray-800",
    }
    return colors[role] || colors.member
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage teams and collaborate with your colleagues</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <TeamForm
              onSuccess={() => {
                setIsCreateDialogOpen(false)
                loadTeams()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
      ) : teams.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No teams yet</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Team
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedTeam(team)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{team.name}</h3>
                {team.current_user_role && (
                  <Badge className={getRoleBadge(team.current_user_role)}>
                    {team.current_user_role}
                  </Badge>
                )}
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{team.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{team.member_count} member{team.member_count !== 1 ? "s" : ""}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedTeam && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedTeam.name}</h2>
              {selectedTeam.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedTeam.description}</p>
              )}
            </div>
            <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <AddMemberForm
                  teamId={selectedTeam.id}
                  onSuccess={() => {
                    setIsAddMemberDialogOpen(false)
                    loadTeamMembers(selectedTeam.id)
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium mb-3">Team Members</h3>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getRoleIcon(member.role)}
                    <div>
                      <p className="font-medium text-sm">{member.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getRoleBadge(member.role)}>
                    {member.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function TeamForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "error",
      })
      return
    }

    try {
      setLoading(true)
      await createTeam({ name, description: description || undefined })
      toast({
        title: "Success",
        description: "Team created successfully",
      })
      onSuccess()
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Team</DialogTitle>
        <DialogDescription>
          Create a new team to collaborate with your colleagues
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="team-name">Team Name *</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sales Team"
            required
          />
        </div>
        <div>
          <Label htmlFor="team-description">Description</Label>
          <Textarea
            id="team-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Team"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function AddMemberForm({ teamId, onSuccess }: { teamId: string; onSuccess: () => void }) {
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState("member")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "User ID is required",
        variant: "error",
      })
      return
    }

    try {
      setLoading(true)
      await addTeamMember(teamId, { user_id: userId, role })
      toast({
        title: "Success",
        description: "Member added successfully",
      })
      onSuccess()
    } catch (error) {
      console.error("Error adding member:", error)
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogDescription>
          Add a user to this team by their user ID
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="user-id">User ID *</Label>
          <Input
            id="user-id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID"
            required
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Member"}
        </Button>
      </DialogFooter>
    </form>
  )
}

