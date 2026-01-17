import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Video, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';

const ProjectsScreen = () => {
  const navigate = useNavigate();
  const projects = ProjectService.getProjects();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      ProjectService.deleteProject(id);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Projects</h1>
        </div>
        <Button variant="gradient" size="sm" onClick={() => {
          const p = ProjectService.createProject();
          ProjectService.saveProject(p);
          navigate(`/editor/${p.id}`);
        }}>
          <Plus className="w-4 h-4" /> New
        </Button>
      </header>

      <div className="p-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Video className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No projects yet</p>
            <Button variant="gradient" className="mt-4" onClick={() => {
              const p = ProjectService.createProject();
              ProjectService.saveProject(p);
              navigate(`/editor/${p.id}`);
            }}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project, i) => (
              <motion.div key={project.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => navigate(`/editor/${project.id}`)}>
                <div className="w-20 h-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                  {project.thumbnail ? <img src={project.thumbnail} alt="" className="w-full h-full object-cover" /> : <Video className="w-6 h-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{MediaService.formatDuration(project.duration)} • {new Date(project.updatedAt).toLocaleDateString()}</p>
                </div>
                <Button variant="iconGhost" size="iconSm" onClick={(e) => handleDelete(project.id, e)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsScreen;
